"""automation for janki"""
# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import json
import os
import shutil
import subprocess
from datetime import datetime
from hashlib import sha256
from pathlib import Path

from doit import tools

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


def task_binder():
    """prepare for basic interactive development, as on binder"""
    return dict(task_dep=["dev:ext"], actions=[["echo", "ok"]])


def task_setup():
    """ensure a working setup"""
    yield dict(
        name="js",
        doc="ensure local npm dependencies",
        file_dep=[*P.PKG_JSONS, P.ROOT_PKG_JSON],
        actions=[
            [P.JLPM],
            [P.JLPM, "lerna", "bootstrap"],
        ],
        targets=[P.YARN_INTEGRITY],
    )


def task_build():
    """build intermediate artifacts"""
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
        actions=[[P.JLPM, "build:lib"]],
        targets=[P.TSBUILDINFO],
    )

    # todo: figure this out
    # yield dict(
    #     name="ext",
    #     doc="build the federated labextension",
    #     actions=[[P.JLPM, "build:ext"]],
    #     file_dep=[P.TSBUILDINFO, *P.ALL_STYLE],
    #     targets=[P.EXT_PKGS],
    # )


def task_dist():
    """build artifacts for distribution"""
    for pkg_json in P.PKG_JSONS:
        if pkg_json == P.PKG_META:
            continue
        pkg = pkg_json.parent
        targets, file_dep = U._tgz_for(pkg_json)

        yield dict(
            name=f"js:{pkg.name}",
            doc=f"build the npm distribution for {pkg}",
            file_dep=file_dep,
            actions=[
                (tools.create_folder, [P.DIST]),
                U._act(P.NPM, "pack", pkg, cwd=P.DIST),
            ],
            targets=targets,
        )

    for cmd, dist in D.PY_DIST_CMD.items():
        yield dict(
            name=cmd,
            doc=f"build the python {cmd}",
            actions=[[*C.SETUP, cmd], [*C.TWINE_CHECK, dist]],
            file_dep=[
                *P.ALL_PY_SRC,
                # P.EXT_PKG, TODO: WHAT
                P.README,
                P.LICENSE,
                P.MANIFEST,
                P.SETUP_PY,
                P.SETUP_CFG,
            ],
            targets=[dist],
        )

    def _run_hash():
        # mimic sha256sum CLI
        if P.SHA256SUMS.exists():
            P.SHA256SUMS.unlink()

        lines = []

        for p in D.HASH_DEPS:
            if p.parent != P.DIST:
                tgt = P.DIST / p.name
                if tgt.exists():
                    tgt.unlink()
                shutil.copy2(p, tgt)
            lines += ["  ".join([sha256(p.read_bytes()).hexdigest(), p.name])]

        output = "\n".join(lines)
        print(output)
        P.SHA256SUMS.write_text(output)

    yield dict(
        name="hash",
        doc="make a hash bundle of the dist artifacts",
        actions=[_run_hash],
        file_dep=D.HASH_DEPS,
        targets=[P.SHA256SUMS],
    )


def task_dev():
    """prepare for interactive development"""
    yield dict(
        name="py",
        doc="install python for interactive development",
        actions=[
            [
                *C.PIP,
                "install",
                "-e",
                ".",
                "--no-deps",
                "--ignore-installed",
            ]
        ],
        # file_dep=[P.EXT_PKG], TODO
    )

    yield dict(
        name="ext",
        doc="ensure the labextension is symlinked for live development",
        actions=[[*C.LAB_EXT, "develop", "--overwrite", "."]],
        task_dep=["dev:py"],
    )


def task_lab():
    """start jupyterlab"""
    return dict(
        uptodate=[lambda: False],
        task_dep=["dev:ext"],
        actions=[[*C.LAB, "--no-browser", "--debug"]],
    )


def task_watch():
    """watch typescript sources, rebuilding as files change"""

    def _watch():
        watchers = [
            subprocess.Popen(args)
            for args in [
                ["jlpm", "watch:lib"],
                [*C.LAB_EXT, "watch", "."],
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

    return dict(
        uptodate=[lambda: False],
        task_dep=["dev:ext"],
        actions=[tools.PythonInteractiveAction(_watch)],
    )


def task_lint():
    """apply source formatting and linting"""
    yield dict(
        name="py",
        doc="run basic python formatting/checking",
        file_dep=P.ALL_PY,
        actions=[
            ["isort", *P.ALL_PY],
            ["black", "--quiet", *P.ALL_PY],
            ["pyflakes", *P.ALL_PY],
        ],
    )

    yield U._do(
        dict(
            name="prettier",
            doc="format things with prettier",
            file_dep=[*P.ALL_PRETTIER, P.YARN_INTEGRITY],
            actions=[
                [
                    P.JLPM,
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
            actions=[[P.JLPM, "eslint:fix"]],
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
    IGNORE = [".ipynb_checkpoints", "node_modules"]
    PYM = ["python", "-m"]
    PIP = [*PYM, "pip"]
    JP = ["jupyter"]
    LAB_EXT = [*JP, "labextension"]
    LAB = [*JP, "lab"]
    SETUP = ["python", "setup.py"]
    TWINE_CHECK = [*PYM, "twine", "check"]


class P:
    """paths"""

    DODO = Path(__file__)
    ROOT = DODO.parent

    BUILD = ROOT / "build"
    DIST = ROOT / "dist"
    LIB = ROOT / "lib"
    BINDER = ROOT / ".binder"
    CI = ROOT / ".github"
    JLPM = Path(shutil.which("jlpm")).resolve()
    NPM = Path(
        shutil.which("npm") or shutil.which("npm.cmd") or shutil.which("npm.exe")
    ).resolve()

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
    TSCONFIGS = PU._clean(
        SRC_JS / "tsconfigbase.json",
        SRC_JS.glob("*/tsconfig.json"),
        SRC_JS.glob("*/src/tsconfig.json"),
    )
    TSBUILDINFO = PKG_META.parent / ".src.tsbuildinfo"
    ESLINTRC = SRC_JS / ".eslintrc.js"
    EXT_DIST = JANKI_PY / "labextensions"
    EXT_PKG_JSONS = [*EXT_DIST.glob("*/*/package.json")]
    TS_SRC = ROOT / "src"

    ALL_SCHEMA = PU._clean(SRC_JS.rglob("*/schema/*.json"))
    ALL_TS_SRC = PU._clean(
        SRC_JS.rglob("*/src/**/*.ts"), SRC_JS.rglob("*/src/**/*.tsx")
    )
    ALL_PY_SRC = PU._clean(SRC_PY.rglob("*.py"))
    ALL_PY = PU._clean(ALL_PY_SRC, DODO)
    ALL_STYLE = PU._clean(SRC_JS.glob("*/style/*.css"), SRC_JS.glob("*/style/*.js"))
    ALL_JSON = PU._clean(
        ROOT.glob("*.json"),
        BINDER.rglob("*.json"),
        PKG_JSONS,
        TSCONFIGS,
        ALL_SCHEMA,
        ROOT_PKG_JSON,
    )
    README = ROOT / "README.md"
    LICENSE = ROOT / "LICENSE.txt"
    ALL_MD = sorted(ROOT.glob("*.md"))
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
    # WEBPACK_JS = ROOT / "webpack.config.js"
    SHA256SUMS = DIST / "SHA256SUMS"


class B:
    """built"""

    OK_ESLINT = P.BUILD / "eslint.ok"
    OK_PRETTIER = P.BUILD / "prettier.ok"


class D:
    """data"""

    PKG_JSONS = {
        pkg_json: json.loads(pkg_json.read_text(**C.ENC)) for pkg_json in P.PKG_JSONS
    }
    PKG_CORE = PKG_JSONS[P.PKG_CORE]
    SDIST = P.DIST / ("{}-{}.tar.gz".format(C.PY_NAME, PKG_CORE["version"]))
    WHEEL = P.DIST / (
        "{}-{}-py3-none-any.whl".format(
            C.PY_NAME.replace("-", "_"), PKG_CORE["version"]
        )
    )
    PY_DIST_CMD = {"sdist": SDIST, "bdist_wheel": WHEEL}
    HASH_DEPS = [WHEEL, SDIST]  # TODO: figure out entropy, *NPM_TGZ.values()]

    # this line is very long, should end with "contributors," but close enough
    COPYRIGHT = (
        "Copyright (c) {} "
        "University System of Georgia and janki contributors".format(
            datetime.now().year
        )
    )
    LICENSE = "Distributed under the terms of the BSD-3-Clause License."


class U:
    @staticmethod
    def _act(*cmd, cwd=P.ROOT, **kwargs):
        if "env" in kwargs:
            env = dict(**os.environ)
            env.update(**kwargs.pop("env"))
            kwargs["env"] = env
        return tools.CmdAction([*cmd], cwd=cwd, shell=False, **kwargs)

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
        tgz = P.DIST / (
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
