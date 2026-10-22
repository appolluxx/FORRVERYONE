"""Trace a compiled in-memory Custom module. Never write custom.py."""
import ast
import json
import sys
import importlib.util
import importlib.abc
import importlib.machinery
from pathlib import Path


def instrument_custom(path):
    source = Path(path).read_text()
    lines = source.splitlines()
    stages = {}

    class Steps(ast.NodeTransformer):
        function = None

        def visit_FunctionDef(self, node):
            previous = self.function
            self.function = node.name
            self.generic_visit(node)
            self.function = previous
            return node

        visit_AsyncFunctionDef = visit_FunctionDef

        def visit(self, node):
            function = self.function
            result = super().visit(node)
            if (not function or not isinstance(node, ast.stmt)
                    or isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                                         ast.ClassDef, ast.Global, ast.Nonlocal))
                    or isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant)
                    and isinstance(node.value.value, str)):
                return result
            line = node.lineno
            stages[str(line)] = {"function": function, "line": line,
                                 "command": lines[line - 1].strip()[:240]}
            marker = ast.Expr(ast.Call(ast.Name("_rb_sim_custom_step_", ast.Load()),
                                       [ast.Constant(line)], []))
            ast.copy_location(marker, node)
            return [marker, result]

    tree = Steps().visit(ast.parse(source, filename=str(path)))
    # Preserve module docstrings and __future__ imports.
    index = 0
    while index < len(tree.body):
        node = tree.body[index]
        if (isinstance(node, ast.ImportFrom) and node.module == "__future__"
                or isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant)
                and isinstance(node.value.value, str)):
            index += 1
        else:
            break
    tree.body.insert(index, ast.ImportFrom("_sim_trace", [ast.alias("step", "_rb_sim_custom_step_")], 0))
    ast.fix_missing_locations(tree)
    code = compile(tree, str(path), 'exec')

    class TracedLoader(importlib.machinery.SourceFileLoader):
        def get_code(self, fullname):
            return code

    class TracedCustomFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path=None, target=None):
            if fullname == 'custom':
                return importlib.util.spec_from_file_location(
                    fullname, source_path, loader=TracedLoader(fullname, source_path))

    # Installing tracing must not execute an unused board-specific module or
    # run its setup before the user's own imports. Python owns import timing,
    # circular-import handling, caching and cleanup after failed imports.
    source_path = str(path)
    sys.meta_path.insert(0, TracedCustomFinder())
    return stages


json.dumps(instrument_custom('/home/sim/custom.py'))
