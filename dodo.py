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
        targets=[P.YARN_INTEGRITY],
    )


def task_build():
    """build intermediate artifacts"""
    if C.TESTING_IN_CI:
        return

    yield dict(
        name="js:lib",
        doc="build the js libs",
        file_dep=[
            P.YARN_INTEGRITY,
            *P.ALL_TS_SRC,
            *P.PKG_JSONS,
            *P.ALL_SCHEMA,
            *P.TSCONFIGS,
        ],
        actions=[[C.JLPM, "build:lib"]],
        targets=[B.TSBUILDINFO],
    )

    for pkg_json, data in D.PKG_JSONS.items():
        if not data.get("jupyterlab"):
            continue

        file_dep = U._tgz_for(pkg_json)[1]

        yield dict(
            name=f"""ext:{data["name"]}""",
            doc="build the federated labextension",
            actions=[[C.JLPM, "build:ext", "--scope", data["name"]]],
            file_dep=[B.TSBUILDINFO, *file_dep],
            targets=[B.EXT_DIST / data["name"] / "package.json"],
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

    for cmd, dist in B.PY_DIST_CMD.items():
        yield dict(
            name=cmd,
            doc=f"build the python {cmd}",
            actions=[[*C.SETUP, cmd], [*C.TWINE_CHECK, dist]],
            file_dep=[
                *B.EXT_PKG_JSON,
                *P.ALL_PY_SRC,
                *P.JP_CONF_JSON,
                P.LICENSE,
                P.MANIFEST,
                P.README,
                P.SETUP_CFG,
                P.SETUP_PY,
            ],
            targets=[dist],
        )

    hash_deps = [B.SDIST, B.WHEEL] + sum(
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

    file_dep = (
        []
        if C.TESTING_IN_CI
        else [
            *B.EXT_PKG_JSON,
            P.SETUP_PY,
            P.SETUP_CFG,
        ]
    )

    pip_args = [*C.PIP, "install", "-v", "--no-deps", "--ignore-installed"]

    pip_args += [B.PY_DIST_CMD[C.CI_ARTIFACT]] if C.TESTING_IN_CI else ["-e", "."]

    yield U._do(
        dict(
            name="py",
            doc="install python for interactive development",
            actions=[
                pip_args,
                [*C.PIP, "freeze"],
                [*C.PIP, "check"],
            ],
            file_dep=file_dep,
        ),
        ok=B.OK_PIP_DEV,
    )

    ext_actions = []

    if not C.TESTING_IN_CI:
        ext_actions = [
            [*C.LAB_EXT, "develop", "--overwrite", "."],
            [*C.JP, "server", "extension", "enable", "--sys-prefix", "--py", C.PY_NAME],
            [*C.JP, "serverextension", "enable", "--sys-prefix", "--py", C.PY_NAME],
        ]

    ext_actions += [
        *ext_actions,
        [*C.JP, "labextension", "list"],
        [*C.JP, "serverextension", "list"],
        [*C.JP, "server", "extension", "list"],
    ]

    yield U._do(
        dict(
            name="ext",
            doc="ensure jupyter extensions are available",
            file_dep=[B.OK_PIP_DEV],
            actions=ext_actions,
        ),
        ok=B.OK_EXT_DEV,
    )


def task_test():
    """run tests"""
    yield U._do(
        dict(
            name="pytest",
            actions=[
                [
                    *C.PYM,
                    "pytest",
                    "--pyargs",
                    C.PY_NAME,
                    "--cov",
                    C.PY_NAME,
                    "--cov-report",
                    "term-missing:skip-covered",
                    "--no-cov-on-fail",
                    "--cov-fail-under",
                    C.COV_THRESHOLD,
                ]
            ],
            file_dep=[*P.ALL_PY_SRC, B.OK_EXT_DEV],
        ),
        # TODO: use a report
        B.OK_PYTEST,
    )


def task_lab():
    """start jupyterlab"""

    def _lab():
        p = subprocess.Popen(
            [
                *C.LAB,
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
            file_dep=[*P.ALL_PRETTIER, P.YARN_INTEGRITY],
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
            if D.COPYRIGHT not in any_text:
                problems += [f"{path.relative_to(P.ROOT)} missing copyright info"]
            if path != P.LICENSE and D.LICENSE not in any_text:
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
    PY_NAME = "janki"
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
    COV_THRESHOLD = "100"
    BUILDING_IN_CI = bool(json.loads(os.environ.get("BUILDING_IN_CI", "0")))
    TESTING_IN_CI = bool(json.loads(os.environ.get("TESTING_IN_CI", "0")))
    CI_ARTIFACT = os.environ.get("CI_ARTIFACT")


class P:
    """paths"""

    DODO = Path(__file__)
    ROOT = DODO.parent

    BINDER = ROOT / ".binder"
    CI = ROOT / ".github"
    SETUP_PY = ROOT / "setup.py"
    SETUP_CFG = ROOT / "setup.cfg"
    MANIFEST = ROOT / "MANIFEST.in"

    SRC_PY = ROOT / "src/py"
    SRC_JS = ROOT / "src/js"
    JANKI_PY = SRC_PY / C.PY_NAME
    ROOT_PKG_JSON = ROOT / "package.json"
    PKG_JSONS = [*SRC_JS.glob("*/package.json")]
    PKG_CORE = SRC_JS / "janki/package.json"
    PKG_META = SRC_JS / "_meta/package.json"
    JP_CONF_JSON = sorted((SRC_PY / "jupyter-config").glob("*.json"))
    TSCONFIGS = PU._clean(
        SRC_JS / "tsconfigbase.json",
        SRC_JS.glob("*/tsconfig.json"),
        SRC_JS.glob("*/src/tsconfig.json"),
    )
    ESLINTRC = SRC_JS / ".eslintrc.js"
    TS_SRC = ROOT / "src"

    ALL_SCHEMA = PU._clean(SRC_JS.rglob("*/schema/*.json"))
    ALL_TS_SRC = PU._clean(
        SRC_JS.rglob("*/src/**/*.ts"), SRC_JS.rglob("*/src/**/*.tsx")
    )
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
    README = ROOT / "README.md"
    LICENSE = ROOT / "LICENSE.txt"
    ALL_MD = PU._clean(ROOT.glob("*.md"), CI.rglob("*.md"), SRC_JS.glob("*/*.md"))
    ALL_YAML = [*CI.rglob("*.yml"), *BINDER.glob("*.yml")]
    ALL_PRETTIER = PU._clean(
        ALL_MD, ALL_STYLE, ALL_JSON, ALL_YAML, ALL_TS_SRC, ALL_STYLE, ESLINTRC
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
        SETUP_CFG,
        ESLINTRC,
    )

    YARN_INTEGRITY = ROOT / "node_modules/.yarn-integrity"


class D:
    """data"""

    PKG_JSONS = {
        pkg_json: json.loads(pkg_json.read_text(**C.ENC)) for pkg_json in P.PKG_JSONS
    }
    PKG_CORE = PKG_JSONS[P.PKG_CORE]

    # this line is very long, should end with "contributors," but close enough
    COPYRIGHT = (
        "Copyright (c) {} "
        "University System of Georgia and janki contributors".format(
            datetime.now().year
        )
    )
    LICENSE = "Distributed under the terms of the BSD-3-Clause License."


class B:
    """built"""

    DIST = P.ROOT / "dist"
    BUILD = P.ROOT / "build"
    EXT_DIST = P.JANKI_PY / "labextensions"
    EXT_PKG_JSON = [
        P.JANKI_PY / "labextensions" / data["name"] / "package.json"
        for pkg_json, data in D.PKG_JSONS.items()
        if "jupyterlab" in data
    ]
    TSBUILDINFO = P.PKG_META.parent / ".src.tsbuildinfo"
    OK_ESLINT = BUILD / "eslint.ok"
    OK_PRETTIER = BUILD / "prettier.ok"
    OK_PIP_DEV = BUILD / "pip.dev.ok"
    OK_EXT_DEV = BUILD / "ext.dev.ok"
    OK_PYTEST = BUILD / "pytest.ok"
    SDIST = DIST / ("{}-{}.tar.gz".format(C.PY_NAME, D.PKG_CORE["version"]))
    WHEEL = DIST / (
        "{}-{}-py3-none-any.whl".format(
            C.PY_NAME.replace("-", "_"), D.PKG_CORE["version"]
        )
    )
    PY_DIST_CMD = {"sdist": SDIST, "bdist_wheel": WHEEL}
    SHA256SUMS = DIST / "SHA256SUMS"


class U:
    @staticmethod
    def _act(*cmd, cwd=P.ROOT, **kwargs):
        if "env" in kwargs:
            env = dict(**os.environ)
            env.update(**kwargs.pop("env"))
            kwargs["env"] = env
        return doit.tools.CmdAction([*cmd], cwd=cwd, shell=False, **kwargs)

    @staticmethod
    def _do(task, ok=None, **kwargs):
        cwd = kwargs.get("cwd", None)
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
            src.rglob("*.ts"),
            src.rglob("*.tsx"),
            style.rglob("*"),
            schema.rglob("*"),
            path / "LICENSE.txt",
            path / "README.md",
            path.glob("*.tsbuildinfo"),
            pkg_json,
        )

        return [tgz], file_dep


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
