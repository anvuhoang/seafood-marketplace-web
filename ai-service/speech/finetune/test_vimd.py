"""Checks for the pure helpers (no download, no GPU): python -m unittest test_vimd -v"""

import unittest

from vimd import COASTAL_PROVINCES, check_provinces, normalize_text, parse_provinces, shards_for

INDEX = {
    "test": {
        "data/test-00000.parquet": {"AnGiang": 31, "QuangNgai": 38},
        "data/test-00001.parquet": {"KhanhHoa": 30, "QuangNgai": 5},
        "data/test-00002.parquet": {"HaNoi": 29},
    }
}


class NormalizeText(unittest.TestCase):
    def test_ignores_case_punctuation_and_spacing(self):
        self.assertEqual(normalize_text("Tôm sú, size 30 con/kg!"), normalize_text("tôm  sú size 30 con kg"))

    def test_keeps_tone_marks(self):
        self.assertNotEqual(normalize_text("ma"), normalize_text("má"))

    def test_same_letters_in_different_unicode_forms_match(self):
        composed = "tôm"
        decomposed = "tôm"
        self.assertEqual(normalize_text(composed), normalize_text(decomposed))

    def test_empty(self):
        self.assertEqual(normalize_text("  ...  "), "")


REGIONS = {"AnGiang": "South", "QuangNgai": "Central", "KhanhHoa": "Central", "HaNoi": "North"}


class Provinces(unittest.TestCase):
    def test_parse_names(self):
        self.assertEqual(parse_provinces("QuangNgai, KhanhHoa"), {"QuangNgai", "KhanhHoa"})

    def test_all_means_every_province(self):
        for value in ("all", "ALL", "", None, "HaNoi,all"):
            self.assertIsNone(parse_provinces(value), value)

    def test_coastal_preset_has_28_provinces(self):
        self.assertEqual(len(COASTAL_PROVINCES), 28)
        self.assertEqual(parse_provinces("coastal"), set(COASTAL_PROVINCES))

    def test_tokens_can_be_mixed(self):
        self.assertEqual(parse_provinces("coastal,HaNoi"), set(COASTAL_PROVINCES) | {"HaNoi"})

    def test_region(self):
        self.assertEqual(parse_provinces("region:Central", REGIONS), {"QuangNgai", "KhanhHoa"})
        self.assertEqual(parse_provinces("region:central,HaNoi", REGIONS), {"QuangNgai", "KhanhHoa", "HaNoi"})

    def test_unknown_region_stops(self):
        with self.assertRaises(SystemExit):
            parse_provinces("region:Mars", REGIONS)

    def test_misspelt_province_is_reported_with_the_valid_names(self):
        index = {"regions": REGIONS}
        check_provinces({"QuangNgai"}, index)
        with self.assertRaises(SystemExit) as caught:
            check_provinces({"QuangNgai", "Quang Ngai"}, index)
        self.assertIn("Quang Ngai", str(caught.exception))
        self.assertIn("KhanhHoa", str(caught.exception))

    def test_only_files_with_the_provinces_are_chosen(self):
        self.assertEqual(
            shards_for(INDEX, "test", {"KhanhHoa"}),
            ["data/test-00001.parquet"],
        )

    def test_a_province_spread_over_two_files_picks_both(self):
        self.assertEqual(
            shards_for(INDEX, "test", {"QuangNgai"}),
            ["data/test-00000.parquet", "data/test-00001.parquet"],
        )

    def test_unknown_province_or_split_picks_nothing(self):
        self.assertEqual(shards_for(INDEX, "test", {"Atlantis"}), [])
        self.assertEqual(shards_for(INDEX, "valid", {"QuangNgai"}), [])

    def test_all_provinces_picks_every_file(self):
        self.assertEqual(len(shards_for(INDEX, "test", None)), 3)


if __name__ == "__main__":
    unittest.main()
