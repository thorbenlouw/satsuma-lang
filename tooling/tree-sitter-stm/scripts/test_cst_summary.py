#!/usr/bin/env python3

from __future__ import annotations

import unittest

from cst_summary import SourceText, parse_tree_dump, summarize_tree


SOURCE = """source customer "Customer" {
  id STRING @pk("yes")
  note '''Doc'''
}
mapping customer -> out {
  id -> out_id // ok
}
"""


TREE = """(source_file [0, 0] - [6, 1]
  (schema_block [0, 0] - [3, 1]
    keyword: (schema_keyword [0, 0] - [0, 6])
    name: (identifier [0, 7] - [0, 15])
    description: (string_literal [0, 16] - [0, 26])
    body: (schema_body [0, 27] - [3, 1]
      (field_declaration [1, 2] - [1, 22]
        name: (identifier [1, 2] - [1, 4])
        type: (type_expression [1, 5] - [1, 11]
          name: (identifier [1, 5] - [1, 11]))
        annotation: (annotation [1, 12] - [1, 22]
          name: (identifier [1, 13] - [1, 15])
          (string_literal [1, 16] - [1, 21])))
      (note_block [2, 2] - [2, 16]
        value: (multiline_string [2, 7] - [2, 16]))))
  (map_block [4, 0] - [6, 1]
    source: (namespaced_path [4, 8] - [4, 16]
      (identifier [4, 8] - [4, 16]))
    target: (namespaced_path [4, 20] - [4, 23]
      (identifier [4, 20] - [4, 23]))
    body: (map_body [4, 24] - [6, 1]
      (map_entry [5, 2] - [5, 20]
        source: (field_path [5, 2] - [5, 4]
          (path_segment [5, 2] - [5, 4]
            (identifier [5, 2] - [5, 4])))
        target: (field_path [5, 8] - [5, 14]
          (path_segment [5, 8] - [5, 14]
            (identifier [5, 8] - [5, 14])))
        (info_comment [5, 15] - [5, 20]))))
"""


class CSTSummaryTests(unittest.TestCase):
    def test_summary_extracts_blocks_and_members(self) -> None:
        root = parse_tree_dump(TREE)
        summary = summarize_tree(SourceText(SOURCE), root)

        self.assertTrue(summary["parse_ok"])
        self.assertEqual(summary["blocks"][0]["label"], "source customer")
        self.assertEqual(summary["blocks"][0]["description"], "Customer")
        self.assertEqual(summary["schema_members"][0]["name"], "id")
        self.assertEqual(summary["schema_members"][0]["type"], "STRING")
        self.assertEqual(summary["annotations"][0]["name"], "pk")
        self.assertEqual(summary["notes"][0]["text"], "Doc")

    def test_summary_extracts_map_paths_and_comments(self) -> None:
        root = parse_tree_dump(TREE)
        summary = summarize_tree(SourceText(SOURCE), root)

        self.assertEqual(summary["map_items"][0]["source"], "id")
        self.assertEqual(summary["map_items"][0]["target"], "out_id")
        self.assertEqual(summary["paths"][0]["text"], "customer")
        self.assertEqual(summary["comments"][0]["severity"], "info")
        self.assertEqual(summary["comments"][0]["text"], "// ok")


if __name__ == "__main__":
    unittest.main()
