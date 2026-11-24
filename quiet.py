"""Keep data-source and bookmaker names out of the public GitHub Actions logs.

run(main) sends stdout and stderr through a filter that replaces any word, file name or URL holding one
of the names with <source>, and turns an uncaught error into a redacted traceback and exit code 1.
A SystemExit with a message keeps its text (minus the names). The data files are not touched.
"""
import re
import sys
import traceback

NAMES = re.compile(r"(?:\w+://)?[\w./?=&%~+-]*(?:espn|flashscore|football-data|superbet|stoiximan|bwin|novibet|pinnacle|"
                   r"betfair|oddsportal|betexplorer|sofascore|fotmob|understat|\bopta\b)[\w./?=&%~+-]*", re.I)


def clean(text):
    return NAMES.sub("<source>", str(text))


class _Filter:
    def __init__(self, stream):
        self.stream = stream

    def write(self, s):
        return self.stream.write(clean(s))

    def __getattr__(self, name):
        return getattr(self.stream, name)


def run(main, *args):
    if not isinstance(sys.stdout, _Filter):
        sys.stdout, sys.stderr = _Filter(sys.stdout), _Filter(sys.stderr)
    try:
        return main(*args)
    except SystemExit as e:
        if e.code is None or isinstance(e.code, int):
            raise
        print(clean(e.code), file=sys.stderr, flush=True)
        sys.exit(1)
    except BaseException:
        print(clean(traceback.format_exc()), file=sys.stderr, flush=True)
        sys.exit(1)
