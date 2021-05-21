"""automation for janki"""
# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from hashlib import sha256
from pathlib import Path

import doit


def task_binder():
    """prepare for basic interactive development, as on binder"""
    yield dict(name="setup", file_dep=[B.OK_EXT_DEV], actions=[["echo", "ok"]])


def task_env():
    """fix up environments"""
    if C.TESTING_IN_CI or C.BUILDING_IN_CI:
        return

    for target, file_dep in P.ENV_DEPS.items():
        yield dict(
            name=f"{target.parent.name}",
            file_dep=[*file_dep, B.YARN_INTEGRITY],
            targets=[target],
            actions=[
                (U.sync_env, [target, file_dep]),
                [C.JLPM, "prettier", "--list-different", "--write", target],
            ],
        )


def task_release():
    yield dict(
        name="ok",
        actions=[lambda: print(B.SHA256SUMS.read_text(**C.ENC))],
        file_dep=[B.OK_PYTEST, B.SHA256SUMS, B.OK_ESLINT],
    )


def task_setup():
    """ensure a working setup"""
    if C.TESTING_IN_CI:
        return

    jlpm = [C.JLPM]

    if C.BUILDING_IN_CI:
        jlpm += ["--frozen-lockfile"]

    yield dict(
        name="js",
        doc="ensure local npm dependencies",
        file_dep=[*P.PKG_JSONS, P.ROOT_PKG_JSON],
        actions=[
            jlpm,
            [C.JLPM, "lerna", "bootstrap"],
        ],
        targets=[B.YARN_INTEGRITY],
    )


def task_build():
    """build intermediate artifacts"""
    if C.TESTING_IN_CI:
        return

    yield dict(
        name="schema",
        file_dep=[P.PLUGIN_SCHEMA, B.YARN_INTEGRITY],
        targets=[P.PLUGIN_SCHEMA_DTS],
        actions=[
            (U.schema_to_ts, [P.PLUGIN_SCHEMA, P.PLUGIN_SCHEMA_DTS]),
            [C.JLPM, "prettier", "--list-different", "--write", P.PLUGIN_SCHEMA_DTS],
        ],
    )

    yield dict(
        name="js:lib",
        doc="build the js libs",
        file_dep=[
            *P.ALL_SCHEMA,
            *P.ALL_TS_SRC,
            *P.PKG_JSONS,
            *P.TSCONFIGS,
            P.PLUGIN_SCHEMA_DTS,
        ],
        actions=[[C.JLPM, "build:lib"]],
        targets=[B.TSBUILDINFO],
    )

    for pkg_json, data in D.PKG_JSONS.items():
        if not data.get("jupyterlab"):
            continue

        py_name = data["jupyterlab"]["discovery"]["server"]["base"]["name"]

        file_dep = U._tgz_for(pkg_json)[1]

        yield dict(
            name=f"""ext:{data["name"]}""",
            doc="build the federated labextension",
            actions=[[C.JLPM, "build:ext", "--scope", data["name"]]],
            file_dep=[B.TSBUILDINFO, *file_dep],
            targets=[
                P.SRC_PY
                / py_name
                / "src"
                / py_name.replace("-", "_")
                / "labextensions"
                / data["name"]
                / "package.json"
            ],
        )


def task_dist():
    """build artifacts for distribution"""
    if C.TESTING_IN_CI:
        return

    for pkg_json in P.PKG_JSONS:
        if pkg_json == P.PKG_META:
            continue
        pkg = pkg_json.parent
        targets, file_dep = U._tgz_for(pkg_json)

        yield dict(
            name=f"js:{pkg.name}",
            doc=f"build the npm distribution for {pkg}",
            file_dep=[*file_dep, B.TSBUILDINFO],
            actions=[
                (doit.tools.create_folder, [B.DIST]),
                U._act(C.NPM, "pack", pkg, cwd=B.DIST),
            ],
            targets=targets,
        )

    for setup_py in P.SETUP_PYS:
        path = setup_py.parent
        py_name = path.name
        py_src = path / "src" / py_name.replace("-", "_")
        file_dep = [
            *py_src.rglob("*.json"),
            *py_src.rglob("*.py"),
            *py_src.glob("jupyter-config/*.json"),
            path / "LICENSE.txt",
            path / "MANIFEST.in",
            path / "README.md",
            path / "setup.cfg",
            setup_py,
        ]

        dists = {"sdist": B.SDISTS[py_name], "bdist_wheel": B.WHEELS[py_name]}

        for cmd, dist in dists.items():
            yield U._do(
                dict(
                    name=f"{py_name}:{cmd}",
                    doc=f"build the {path} {cmd}",
                    actions=[[*C.SETUP, cmd, "--dist-dir", B.DIST]],
                    file_dep=file_dep,
                    targets=[dist],
                ),
                cwd=path,
            )

    hash_deps = [*B.SDISTS.values(), *B.WHEELS.values()] + sum(
        [
            U._tgz_for(pkg_json)[0]
            for pkg_json, data in D.PKG_JSONS.items()
            if "jupyterlab" in data
        ],
        [],
    )

    def _run_hash():
        # mimic sha256sum CLI
        if B.SHA256SUMS.exists():
            B.SHA256SUMS.unlink()

        lines = []

        for p in hash_deps:
            lines += ["  ".join([sha256(p.read_bytes()).hexdigest(), p.name])]

        output = "\n".join(lines)
        print(output)
        B.SHA256SUMS.write_text(output)

    yield dict(
        name="hash",
        doc="make a hash bundle of the dist artifacts",
        actions=[_run_hash],
        file_dep=hash_deps,
        targets=[B.SHA256SUMS],
    )


def task_dev():
    """prepare for interactive development"""

    py_tasks = []
    ext_tasks = []
    file_dep = (
        []
        if C.TESTING_IN_CI
        else [
            *sum([*B.EXT_PKG_JSON.values()], []),
            *P.SETUP_PYS,
            *P.SETUP_CFGS,
        ]
    )

    for py_name in C.PY_NAMES:

        pip_args = [*C.PIP, "install", "-v", "--no-deps", "--ignore-installed"]

        pip_args += (
            [B.PY_DIST_CMD[py_name][C.CI_ARTIFACT]] if C.TESTING_IN_CI else ["-e", "."]
        )

        task_name = f"py:{py_name}"

        yield U._do(
            dict(
                name=task_name,
                doc=f"install {py_name} for interactive development",
                actions=[
                    pip_args,
                ],
                file_dep=file_dep,
            ),
            cwd=P.SRC_PY / py_name,
        )

        py_tasks += [f"dev:{task_name}"]

        ext_actions = []

        if not C.TESTING_IN_CI:
            ext_actions = [
                [*C.LAB_EXT, "develop", "--overwrite", "."],
            ]

            if py_name in C.HAS_SERVER_EXT:
                ext_actions += [
                    [
                        *C.JP,
                        "server",
                        "extension",
                        "enable",
                        "--sys-prefix",
                        "--py",
                        py_name,
                    ],
                    [
                        *C.JP,
                        "serverextension",
                        "enable",
                        "--sys-prefix",
                        "--py",
                        py_name,
                    ],
                ]

        ext_actions += [
            *ext_actions,
        ]

        ext_task_name = f"ext:{py_name}"
        ext_tasks += [f"dev:{ext_task_name}"]
        yield U._do(
            dict(
                name=ext_task_name,
                doc="ensure jupyter extensions are available",
                file_dep=[B.OK_PIP_DEV],
                actions=ext_actions,
            ),
            cwd=P.SRC_PY / py_name,
        )

    yield U._do(
        dict(
            name="py:CHECK",
            actions=[[*C.PIP, "freeze"], [*C.PIP, "check"]],
            task_dep=py_tasks,
            file_dep=file_dep,
        ),
        ok=B.OK_PIP_DEV,
    )

    yield U._do(
        dict(
            name="ext:CHECK",
            file_dep=file_dep,
            task_dep=ext_tasks,
            actions=[
                [*C.JP, "labextension", "list"],
                [*C.JP, "serverextension", "list"],
                [*C.JP, "server", "extension", "list"],
            ],
        ),
        ok=B.OK_EXT_DEV,
    )


def task_test():
    """run tests"""
    for py_name in C.PY_NAMES:
        yield U._do(
            dict(
                name=f"pytest:{py_name}",
                actions=[
                    [
                        *C.PYM,
                        "coverage",
                        "run",
                        "-m",
                        "pytest",
                        *("--pyargs", py_name.replace("-", "_")),
                        "-vv",
                        "--hypothesis-show-statistics",
                        *("--html", B.DOCS_REPORT_TEST / py_name),
                        *C.PYTEST_ARGS,
                    ],
                    [*C.PYM, "coverage", "html", "-d", B.DOCS_REPORT_COV / py_name],
                    [
                        *C.PYM,
                        "coverage",
                        "report",
                        "--skip-covered",
                    ],
                ],
                file_dep=[*P.ALL_PY_SRC, B.OK_EXT_DEV, *P.ALL_SCHEMA],
                targets=[
                    B.DOCS_REPORT_TEST / py_name / "index.html",
                    B.DOCS_REPORT_COV / py_name / "status.json",
                ],
            ),
            ok=B.OK_PYTEST / f"{py_name}.ok",
        )


def task_lab():
    """start jupyterlab"""

    def _lab():
        p = subprocess.Popen(
            [
                *C.LAB,
                "--ServerApp.base_url='/jk/'",
                "--no-browser",
                "--debug",
                "--autoreload",
                "--expose-app-in-browser",
            ]
        )

        try:
            p.wait()
        except KeyboardInterrupt:
            p.terminate()
            p.terminate()
        finally:
            p.wait()

    if C.TESTING_IN_CI:
        return

    yield dict(
        name="launch",
        uptodate=[lambda: False],
        file_dep=[B.OK_EXT_DEV],
        actions=[doit.tools.PythonInteractiveAction(_lab)],
    )


def task_watch():
    """watch typescript sources, rebuilding as files change"""

    if C.TESTING_IN_CI:
        return

    def _watch():
        watchers = [
            subprocess.Popen(args)
            for args in [
                [C.JLPM, "watch"],
                # [*C.LAB_EXT, "watch", "."],
            ]
        ]

        def stop():
            [w.terminate() for w in watchers]
            [w.wait() for w in watchers]

        try:
            watchers[0].wait()
        except KeyboardInterrupt:
            pass
        finally:
            stop()
        return True

    yield dict(
        name="ts",
        uptodate=[lambda: False],
        file_dep=[B.OK_EXT_DEV],
        actions=[doit.tools.PythonInteractiveAction(_watch)],
    )


def task_lint():
    """apply source formatting and linting"""

    if C.TESTING_IN_CI:
        return

    yield dict(
        name="py",
        doc="run basic python formatting/checking",
        file_dep=P.ALL_PY,
        actions=[
            [*C.PYM, "isort", *P.ALL_PY],
            [*C.PYM, "black", "--quiet", *P.ALL_PY],
            [*C.PYM, "pyflakes", *P.ALL_PY],
        ],
    )

    yield U._do(
        dict(
            name="prettier",
            doc="format things with prettier",
            file_dep=[*P.ALL_PRETTIER, B.YARN_INTEGRITY],
            actions=[
                [
                    C.JLPM,
                    "prettier",
                    "--list-different",
                    "--write",
                    *[p.relative_to(P.ROOT) for p in P.ALL_PRETTIER],
                ]
            ],
        ),
        B.OK_PRETTIER,
    )

    yield U._do(
        dict(
            name="eslint",
            file_dep=[*P.ALL_TS_SRC, *P.ALL_SCHEMA, B.OK_PRETTIER],
            actions=[[C.JLPM, "eslint:fix"]],
        ),
        B.OK_ESLINT,
    )

    def _header(path):
        def _check():
            any_text = path.read_text()
            problems = []
            if C.COPYRIGHT not in any_text:
                problems += [f"{path.relative_to(P.ROOT)} missing copyright info"]
            if path != P.LICENSE and C.LICENSE not in any_text:
                problems += [f"{path.relative_to(P.ROOT)} missing license info"]
            if problems:
                print("\n".join(problems))
                return False
            return True

        return _check

    for path in P.ALL_HEADERS:
        yield dict(
            name=f"headers:{path.relative_to(P.ROOT)}",
            doc=f"ensure license/copyright on {path.name}",
            file_dep=[path],
            actions=[_header(path)],
        )


class PU:
    @staticmethod
    def _clean(*things):
        """clean things for file_dep, targets"""
        cleaned = []
        for thing in things:
            if isinstance(thing, Path):
                thing = [thing]
            for path in thing:
                ignored = False
                if path.is_dir():
                    continue
                for ignore in C.IGNORE:
                    if ignore in str(path):
                        ignored = True
                        break
                if not ignored:
                    cleaned += [path]
        return sorted(set(cleaned))


class C:
    # constants and commands
    PY_NAMES = ["janki", "jupyterlab-sqlite3", "jupyterlab-libarchive"]
    HAS_SERVER_EXT = ["janki"]
    ENC = dict(encoding="utf-8")
    IGNORE = [".ipynb_checkpoints", "node_modules", ".egg-info"]
    PY = Path(sys.executable)
    PYM = [PY, "-m"]
    PIP = [*PYM, "pip"]
    JP = [*PYM, "jupyter"]
    LAB_EXT = [*JP, "labextension"]
    LAB = [*JP, "lab"]
    SETUP = [PY, "setup.py"]
    TWINE_CHECK = [*PYM, "twine", "check"]
    JLPM = Path(shutil.which("jlpm")).resolve()
    NPM = Path(
        shutil.which("npm") or shutil.which("npm.cmd") or shutil.which("npm.exe")
    ).resolve()
    # TODO: get back up to 100
    COV_THRESHOLD = "95"
    BUILDING_IN_CI = bool(json.loads(os.environ.get("BUILDING_IN_CI", "0")))
    TESTING_IN_CI = bool(json.loads(os.environ.get("TESTING_IN_CI", "0")))
    CI_ARTIFACT = os.environ.get("CI_ARTIFACT")
    PYTEST_ARGS = json.loads(os.environ.get("PYTEST_ARGS", "[]"))
    # this line is very long, should end with "contributors," but close enough
    COPYRIGHT = (
        "Copyright (c) {} "
        "University System of Georgia and janki contributors".format(
            datetime.now().year
        )
    )
    LICENSE = "Distributed under the terms of the BSD-3-Clause License."


class P:
    """paths"""

    DODO = Path(__file__)
    ROOT = DODO.parent

    DOCS = ROOT / "docs"

    BINDER = ROOT / ".binder"
    CI = ROOT / ".github"

    MANIFEST = ROOT / "MANIFEST.in"

    SRC_PY = ROOT / "py"
    SRC_JS = ROOT / "js"

    SETUP_PYS = [*SRC_PY.glob("*/setup.py")]
    SETUP_CFGS = [*SRC_PY.glob("*/setup.cfg")]

    ROOT_PKG_JSON = ROOT / "package.json"
    PKG_JSONS = [*SRC_JS.glob("*/package.json")]
    PKG_CORE = SRC_JS / "janki/package.json"
    PKG_META = SRC_JS / "_meta/package.json"
    JP_CONF_JSON = sorted(SRC_PY.glob("*/src/*/jupyter-config/*.json"))
    TSCONFIGS = PU._clean(
        SRC_JS / "tsconfigbase.json",
        SRC_JS.glob("*/tsconfig.json"),
        SRC_JS.glob("*/src/tsconfig.json"),
    )
    ESLINTRC = SRC_JS / ".eslintrc.js"
    PLUGIN_SCHEMA = PKG_CORE.parent / "schema/plugin.json"
    PLUGIN_SCHEMA_DTS = PKG_CORE.parent / "src/_schema.d.ts"

    ALL_SCHEMA = PU._clean(SRC_JS.rglob("*/schema/*.json"))
    ALL_TS_SRC = PU._clean(
        SRC_JS.rglob("*/src/**/*.ts"), SRC_JS.rglob("*/src/**/*.tsx")
    )
    ALL_PKG_JS = PU._clean(SRC_JS.rglob("*/*.js"))
    ALL_PY_SRC = PU._clean(SRC_PY.rglob("*.py"))
    ALL_PY = PU._clean(ALL_PY_SRC, DODO)
    ALL_STYLE = PU._clean(SRC_JS.glob("*/style/*.css"), SRC_JS.glob("*/style/*.js"))
    ALL_JSON = PU._clean(
        JP_CONF_JSON,
        ROOT.glob("*.json"),
        BINDER.rglob("*.json"),
        PKG_JSONS,
        TSCONFIGS,
        ALL_SCHEMA,
        ROOT_PKG_JSON,
    )
    ENV_DOCS = DOCS / "environment.yml"
    ENV_CI = CI / "environment.yml"
    ENV_DEMO = BINDER / "environment.yml"
    ENV_DEPS = {ENV_DOCS: [ENV_CI], ENV_DEMO: [ENV_CI, ENV_DOCS]}
    README = ROOT / "README.md"
    LICENSE = ROOT / "LICENSE.txt"
    ALL_MD = PU._clean(ROOT.glob("*.md"), CI.rglob("*.md"), SRC_JS.glob("*/*.md"))
    ALL_YAML = [*CI.rglob("*.yml"), *BINDER.glob("*.yml"), ENV_DOCS, ENV_CI, ENV_DEMO]
    ALL_PRETTIER = PU._clean(
        ALL_MD,
        ALL_STYLE,
        ALL_JSON,
        ALL_YAML,
        ALL_TS_SRC,
        ALL_STYLE,
        ESLINTRC,
        ALL_PKG_JS,
    )
    ALL_SHELL = [BINDER / "postBuild"]
    ALL_HEADERS = PU._clean(
        ALL_PY,
        ALL_STYLE,
        ALL_TS_SRC,
        ALL_MD,
        ALL_YAML,
        ALL_SHELL,
        LICENSE,
        SETUP_CFGS,
        ESLINTRC,
    )


class D:
    """data"""

    PKG_JSONS = {
        pkg_json: json.loads(pkg_json.read_text(**C.ENC)) for pkg_json in P.PKG_JSONS
    }
    PKG_CORE = PKG_JSONS[P.PKG_CORE]


class B:
    """built"""

    YARN_INTEGRITY = P.ROOT / "node_modules/.yarn-integrity"
    DIST = P.ROOT / "dist"
    BUILD = P.ROOT / "build"
    DOCS_REPORT = P.DOCS / "_reports"
    DOCS_REPORT_COV = DOCS_REPORT / "coverage"
    DOCS_REPORT_TEST = DOCS_REPORT / "pytest"

    EXT_PKG_JSON = {
        py_name: [
            P.SRC_PY
            / py_name
            / "src"
            / py_name.replace("-", "_")
            / "labextensions"
            / data["name"]
            / "package.json"
            for pkg_json, data in D.PKG_JSONS.items()
            if "jupyterlab" in data
            and data["jupyterlab"]["discovery"]["server"]["base"]["name"] == py_name
        ]
        for py_name in C.PY_NAMES
    }
    TSBUILDINFO = P.PKG_META.parent / ".src.tsbuildinfo"
    OK_ESLINT = BUILD / "eslint.ok"
    OK_PRETTIER = BUILD / "prettier.ok"
    OK_PIP_DEV = BUILD / "pip.dev.ok"
    OK_EXT_DEV = BUILD / "ext.dev.ok"
    OK_PYTEST = BUILD / "pytest.ok"

    SDISTS = {
        py_name: P.ROOT
        / "dist"
        / ("{}-{}.tar.gz".format(py_name, D.PKG_CORE["version"]))
        for py_name in C.PY_NAMES
    }
    WHEELS = {
        py_name: P.ROOT
        / "dist"
        / (
            "{}-{}-py3-none-any.whl".format(
                py_name.replace("-", "_"), D.PKG_CORE["version"]
            )
        )
        for py_name in C.PY_NAMES
    }
    PY_DIST_CMD = {"sdist": SDISTS, "bdist_wheel": WHEELS}
    SHA256SUMS = DIST / "SHA256SUMS"

    FIXTURES = BUILD / "fixtures"


class U:
    @staticmethod
    def _act(*cmd, cwd=P.ROOT, **kwargs):
        if callable(cmd[0]):
            return cmd
        if "env" in kwargs:
            env = dict(**os.environ)
            env.update(**{k: f"{v}" for k, v in kwargs.pop("env").items()})
            kwargs["env"] = env
        return doit.tools.CmdAction([*cmd], cwd=cwd, shell=False, **kwargs)

    @staticmethod
    def _do(task, ok=None, **kwargs):
        cwd = kwargs.pop("cwd", None)
        task["actions"] = [
            U._act(*act, cwd=cwd, **kwargs) if isinstance(act, list) else act
            for act in task["actions"]
        ]

        if ok:
            task["actions"] = [
                lambda: [ok.exists() and ok.unlink(), True][-1],
                *task["actions"],
                lambda: [ok.parent.mkdir(exist_ok=True), ok.write_text("ok"), True][-1],
            ]
            task["targets"] = [*task.get("targets", []), ok]
        return task

    @staticmethod
    def _tgz_for(pkg_json):
        """get the tarball for a package.json and its dependencies"""
        pkg = D.PKG_JSONS[pkg_json]
        path = pkg_json.parent
        src = path / "src"
        style = path / "style"
        schema = path / "schema"
        tgz = B.DIST / (
            "{}-{}.tgz".format(
                pkg["name"].replace("@", "").replace("/", "-"), pkg["version"]
            )
        )
        file_dep = PU._clean(
            path / "LICENSE.txt",
            path / "README.md",
            path.glob("*.js"),
            path.glob("*.tsbuildinfo"),
            pkg_json,
            schema.rglob("*"),
            src.rglob("*.ts"),
            src.rglob("*.tsx"),
            style.rglob("*"),
        )

        return [tgz], file_dep

    @staticmethod
    def sync_env(to_env, from_envs):
        from yaml import safe_load

        to_env_text = to_env.read_text(**C.ENC)

        for from_env in from_envs:
            from_env_text = from_env.read_text(**C.ENC)
            from_env_obj = safe_load(from_env_text)
            marker = f"""  ### {from_env_obj["name"]}"""

            from_chunks = from_env_text.split(marker)
            to_chunks = to_env_text.split(marker)
            to_env_text = "".join(
                [to_chunks[0], marker, from_chunks[1], marker, to_chunks[2]]
            )

        to_env.write_text(to_env_text)

    @staticmethod
    def schema_to_ts(source, target):
        args = [
            C.JLPM,
            "--silent",
            "json2ts",
            "--unreachableDefinitions=true",
            "--format=false",
            source,
        ]
        dts = subprocess.check_output([*map(str, args)]).decode(C.ENC["encoding"])
        target.write_text(
            "\n".join([f"// {C.COPYRIGHT}", f"// {C.LICENSE}", dts]), **C.ENC
        )


os.environ.update(
    NODE_OPTS="--max-old-space-size=4096",
    PYTHONIOENCODING="utf-8",
    PIP_DISABLE_PIP_VERSION_CHECK="1",
)

DOIT_CONFIG = {
    "backend": "sqlite3",
    "verbosity": 2,
    "par_type": "thread",
    "default_tasks": ["binder"],
}
