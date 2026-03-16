#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
import sys
import typing as t
import re


ROOT = Path(__file__).resolve().parents[3]
TREE_SITTER_LOCAL = ROOT / "scripts" / "tree-sitter-local.sh"
DEFAULT_GLOBS = (
    "examples/*.stm",
    "features/02-multi-schema/examples/**/*.stm",
)
OWNER_TYPES = {
    "workspace_block",
    "integration_block",
    "schema_block",
    "fragment_block",
    "field_declaration",
    "group_declaration",
    "array_group_declaration",
    "map_block",
    "map_entry",
    "computed_map_entry",
    "block_map_entry",
    "nested_map",
}
BLOCK_TYPES = (
    "namespace_decl",
    "workspace_block",
    "import_declaration",
    "integration_block",
    "schema_block",
    "fragment_block",
    "map_block",
)
PATH_TYPES = (
    "namespaced_path",
    "namespaced_field_path",
    "relative_field_path",
    "field_path",
    "path_reference",
)
NODE_RE = re.compile(
    r"""
    ^
    (?P<indent>\s*)
    (?:(?P<field>[a-z_]+):\s+)?
    \(
    (?P<type>[A-Za-z_][A-Za-z0-9_]*)
    \s+
    \[(?P<start_line>\d+),\s*(?P<start_col>\d+)\]
    \s*-\s*
    \[(?P<end_line>\d+),\s*(?P<end_col>\d+)\]
    """,
    re.VERBOSE,
)


@dataclass(frozen=True)
class Point:
    line: int
    column: int


@dataclass
class Node:
    type: str
    start: Point
    end: Point
    field_name: str | None = None
    children: list["Node"] = field(default_factory=list)
    parent: "Node | None" = None


class SourceText:
    def __init__(self, text: str) -> None:
        self.text = text
        self.lines = text.splitlines(keepends=True)
        self.offsets: list[int] = [0]
        total = 0
        for line in self.lines:
            total += len(line)
            self.offsets.append(total)

    def slice(self, start: Point, end: Point) -> str:
        if start.line >= len(self.lines) and start.line != end.line:
            return ""
        start_offset = self.offsets[start.line] + start.column
        end_offset = self.offsets[end.line] + end.column
        return self.text[start_offset:end_offset]


def parse_tree_dump(tree_text: str) -> Node:
    roots: list[Node] = []
    stack: list[tuple[int, Node]] = []

    for line in tree_text.splitlines():
        match = NODE_RE.match(line)
        if match is None:
            continue

        indent = len(match.group("indent"))
        node = Node(
            type=match.group("type"),
            field_name=match.group("field"),
            start=Point(int(match.group("start_line")), int(match.group("start_col"))),
            end=Point(int(match.group("end_line")), int(match.group("end_col"))),
        )

        while stack and stack[-1][0] >= indent:
            stack.pop()

        if stack:
            parent = stack[-1][1]
            node.parent = parent
            parent.children.append(node)
        else:
            roots.append(node)

        stack.append((indent, node))

    if len(roots) != 1:
        raise ValueError(f"expected exactly one root node, found {len(roots)}")
    return roots[0]


def iter_nodes(node: Node) -> t.Iterator[Node]:
    yield node
    for child in node.children:
        yield from iter_nodes(child)


def field_child(node: Node, name: str) -> Node | None:
    for child in node.children:
        if child.field_name == name:
            return child
    return None


def field_children(node: Node, name: str) -> list[Node]:
    return [child for child in node.children if child.field_name == name]


def node_text(node: Node | None, source: SourceText) -> str | None:
    if node is None:
        return None
    return source.slice(node.start, node.end)


def clean_scalar(text: str | None) -> str | None:
    if text is None:
        return None
    stripped = text.strip()
    if len(stripped) >= 2 and stripped[0] == stripped[-1] == '"':
        return stripped[1:-1]
    if stripped.startswith("'''") and stripped.endswith("'''") and len(stripped) >= 6:
        return stripped[3:-3]
    return stripped


def block_label(node: Node, source: SourceText) -> str:
    if node.type == "namespace_decl":
        return f'namespace "{clean_scalar(node_text(field_child(node, "name"), source))}"'
    if node.type == "workspace_block":
        return f'workspace "{clean_scalar(node_text(field_child(node, "name"), source))}"'
    if node.type == "integration_block":
        return f'integration "{clean_scalar(node_text(field_child(node, "name"), source))}"'
    if node.type == "schema_block":
        keyword = node_text(field_child(node, "keyword"), source) or "schema"
        name = clean_scalar(node_text(field_child(node, "name"), source)) or "<anonymous>"
        return f"{keyword} {name}"
    if node.type == "fragment_block":
        name = clean_scalar(node_text(field_child(node, "name"), source)) or "<anonymous>"
        return f"fragment {name}"
    if node.type == "map_block":
        source_name = clean_scalar(node_text(field_child(node, "source"), source))
        target_name = clean_scalar(node_text(field_child(node, "target"), source))
        if source_name and target_name:
            return f"map {source_name} -> {target_name}"
        return "map"
    if node.type == "import_declaration":
        path = clean_scalar(node_text(field_child(node, "path"), source))
        return f'import "{path}"' if path else "import"
    return node.type


def owner_summary(node: Node | None, source: SourceText) -> dict[str, str] | None:
    cursor = node.parent if node is not None else None
    while cursor is not None:
        if cursor.type in OWNER_TYPES:
            return {
                "type": cursor.type,
                "label": block_label(cursor, source),
            }
        cursor = cursor.parent
    return None


def summarize_block(node: Node, source: SourceText) -> dict[str, t.Any]:
    summary: dict[str, t.Any] = {
        "type": node.type,
        "label": block_label(node, source),
    }

    if node.type == "schema_block":
        summary["description"] = clean_scalar(node_text(field_child(node, "description"), source))
    elif node.type == "fragment_block":
        summary["description"] = clean_scalar(node_text(field_child(node, "description"), source))
    elif node.type == "workspace_block":
        summary["entries"] = sum(1 for child in node.children if child.type == "workspace_body" for grand in child.children if grand.type == "workspace_entry")
    elif node.type == "map_block":
        summary["options"] = sum(1 for child in iter_nodes(node) if child.type == "map_option")

    return summary


def summarize_schema_member(node: Node, source: SourceText) -> dict[str, t.Any]:
    item = {
        "kind": node.type,
        "name": clean_scalar(node_text(field_child(node, "name"), source)),
        "owner": owner_summary(node, source),
    }
    if node.type == "field_declaration":
        item["type"] = clean_scalar(node_text(field_child(node, "type"), source))
        item["annotations"] = [
            clean_scalar(node_text(field_child(annotation, "name"), source))
            for annotation in field_children(node, "annotation")
        ]
        item["has_note"] = field_child(node, "note") is not None
    return item


def summarize_map_item(node: Node, source: SourceText) -> dict[str, t.Any]:
    item = {
        "kind": node.type,
        "owner": owner_summary(node, source),
        "text": clean_scalar(node_text(node, source)),
    }
    if node.type != "nested_map":
        item["source"] = clean_scalar(node_text(field_child(node, "source"), source))
        item["target"] = clean_scalar(node_text(field_child(node, "target"), source))
    item["has_transform"] = ":" in (node_text(node, source) or "")
    return item


def comment_severity(node_type: str) -> str:
    return {
        "warning_comment": "warning",
        "question_comment": "question",
        "info_comment": "info",
    }[node_type]


def summarize_tree(source: SourceText, root: Node) -> dict[str, t.Any]:
    nodes = list(iter_nodes(root))
    counts = Counter(node.type for node in nodes)

    return {
        "parse_ok": counts["ERROR"] == 0 and counts["MISSING"] == 0,
        "counts": dict(sorted(counts.items())),
        "blocks": [summarize_block(node, source) for node in nodes if node.type in BLOCK_TYPES],
        "schema_members": [
            summarize_schema_member(node, source)
            for node in nodes
            if node.type in {"field_declaration", "group_declaration", "array_group_declaration"}
        ],
        "map_items": [
            summarize_map_item(node, source)
            for node in nodes
            if node.type in {"map_entry", "computed_map_entry", "block_map_entry", "nested_map"}
        ],
        "paths": [
            {
                "kind": node.type,
                "text": clean_scalar(node_text(node, source)),
            }
            for node in nodes
            if node.type in PATH_TYPES
        ],
        "comments": [
            {
                "severity": comment_severity(node.type),
                "text": clean_scalar(node_text(node, source)),
                "owner": owner_summary(node, source),
            }
            for node in nodes
            if node.type in {"warning_comment", "question_comment", "info_comment"}
        ],
        "notes": [
            {
                "text": clean_scalar(node_text(field_child(node, "value"), source)),
                "owner": owner_summary(node, source),
            }
            for node in nodes
            if node.type == "note_block"
        ],
        "annotations": [
            {
                "name": clean_scalar(node_text(field_child(node, "name"), source)),
                "owner": owner_summary(node, source),
            }
            for node in nodes
            if node.type == "annotation"
        ],
    }


def discover_files(globs: tuple[str, ...]) -> list[Path]:
    files: list[Path] = []
    for pattern in globs:
        files.extend(path for path in ROOT.glob(pattern) if path.is_file())
    return sorted({path.resolve() for path in files})


def resolve_input_path(path: Path) -> Path:
    if path.is_absolute():
        return path

    cwd_candidate = (Path.cwd() / path).resolve()
    if cwd_candidate.exists():
        return cwd_candidate

    root_candidate = (ROOT / path).resolve()
    if root_candidate.exists():
        return root_candidate

    return cwd_candidate


def parse_with_cli(path: Path) -> Node:
    result = subprocess.run(
        [
            str(TREE_SITTER_LOCAL),
            "parse",
            "-p",
            str(ROOT / "tooling" / "tree-sitter-stm"),
            str(path),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "tree-sitter parse failed")
    return parse_tree_dump(result.stdout)


def build_summary(path: Path) -> dict[str, t.Any]:
    source = SourceText(path.read_text())
    root = parse_with_cli(path)
    summary = summarize_tree(source, root)
    summary["file"] = str(path.relative_to(ROOT))
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Emit JSON summaries from STM CSTs using the repo-local tree-sitter wrapper."
    )
    parser.add_argument("files", nargs="*", type=Path, help="Specific STM files to summarize.")
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output.",
    )
    args = parser.parse_args(argv)

    files = [resolve_input_path(path) for path in args.files] if args.files else discover_files(DEFAULT_GLOBS)
    if not files:
        parser.error("no STM files found")

    summaries: list[dict[str, t.Any]] = []
    failures: list[dict[str, str]] = []

    for path in files:
        try:
            summaries.append(build_summary(path))
        except Exception as exc:  # noqa: BLE001
            failures.append(
                {
                    "file": str(path.relative_to(ROOT)),
                    "error": str(exc),
                }
            )

    payload = {
        "files": summaries,
        "failures": failures,
    }
    json.dump(payload, sys.stdout, indent=2 if args.pretty else None, sort_keys=True)
    sys.stdout.write("\n")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
