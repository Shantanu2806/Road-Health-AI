"""
test_scoring.py - Unit tests for scoring formulas

Run directly with:
    python test_scoring.py
or with pytest:
    pytest test_scoring.py
"""

import unittest
from scoring import (
    compute_damage_index,
    compute_coverage,
    compute_severity,
    compute_road_health_score,
    compute_condition_label,
    assess_road_health,
)


class TestScoringFormulas(unittest.TestCase):

    def test_clean_road(self):
        """Clean road (no detections) must score 100 and condition 'Good'."""
        detections = []
        img_w, img_h = 1000, 1000

        result = assess_road_health(detections, img_w, img_h)

        self.assertEqual(result["damage_index"], 0.0)
        self.assertEqual(result["coverage_pct"], 0.0)
        self.assertEqual(result["severity"], "Low")
        self.assertEqual(result["road_health_score"], 100.0)
        self.assertEqual(result["condition_label"], "Good")
        self.assertEqual(result["detection_count"], 0)

    def test_heavily_damaged_road_critical(self):
        """Heavily damaged fake input must score in the 0-30 'Critical' range."""
        # 5 large potholes (D40, weight 3.0) and 2 alligator cracks (D20, weight 2.5)
        # All with high confidence ~0.90
        detections = [
            {"class_code": "D40", "confidence": 0.95, "bbox": [100, 100, 400, 400]},  # 300x300 = 90,000 px
            {"class_code": "D40", "confidence": 0.90, "bbox": [500, 100, 800, 400]},  # 90,000 px
            {"class_code": "D40", "confidence": 0.92, "bbox": [100, 500, 400, 800]},  # 90,000 px
            {"class_code": "D40", "confidence": 0.88, "bbox": [500, 500, 800, 800]},  # 90,000 px
            {"class_code": "D20", "confidence": 0.90, "bbox": [300, 300, 700, 700]},  # 160,000 px
        ]
        # Total image area = 1000 x 1000 = 1,000,000 px
        # Total box area = 520,000 px -> Coverage = 52.0%
        # DI = (3.0*0.95) + (3.0*0.90) + (3.0*0.92) + (3.0*0.88) + (2.5*0.90) = 2.85 + 2.70 + 2.76 + 2.64 + 2.25 = 13.20
        # Severity = "High" (since DI 13.20 > 12)
        # Score = 100 - (13.20 * 3) - (52.0 * 1.2) = 100 - 39.6 - 62.4 = -2.0 -> clipped to 0.0
        # Condition = "Critical"

        img_w, img_h = 1000, 1000
        result = assess_road_health(detections, img_w, img_h)

        self.assertGreater(result["damage_index"], 12.0)
        self.assertEqual(result["severity"], "High")
        self.assertGreaterEqual(result["coverage_pct"], 50.0)
        self.assertLessEqual(result["road_health_score"], 30.0)
        self.assertEqual(result["condition_label"], "Critical")

    def test_moderate_damage_poor(self):
        """Moderate damage input resulting in 'Poor' condition (31-60)."""
        # DI around 7 (Medium), Coverage around 15%
        # Penalty = (7 * 3) + (15 * 1.2) = 21 + 18 = 39 -> Score = 61 - 39 = 61? 100 - 39 = 61
        # Let's target score ~ 45:
        # DI = 10, Coverage = 20% -> Penalty = 30 + 24 = 54 -> Score = 46.0 ("Poor")
        detections = [
            {"class_code": "D40", "confidence": 0.85, "bbox": [100, 100, 300, 300]}, # DI: 3.0*0.85 = 2.55, 40,000 px
            {"class_code": "D20", "confidence": 0.80, "bbox": [400, 100, 650, 350]}, # DI: 2.5*0.80 = 2.00, 62,500 px
            {"class_code": "D10", "confidence": 0.90, "bbox": [100, 500, 500, 600]}, # DI: 1.5*0.90 = 1.35, 40,000 px
            {"class_code": "D00", "confidence": 0.80, "bbox": [500, 400, 600, 900]}, # DI: 1.0*0.80 = 0.80, 50,000 px
        ]
        # Total area = 1,000,000 px
        # Total box area = 192,500 px -> Coverage = 19.25%
        # DI = 2.55 + 2.00 + 1.35 + 0.80 = 6.70
        # Score = 100 - (6.70 * 3) - (19.25 * 1.2) = 100 - 20.10 - 23.10 = 56.80 -> "Poor" (31-60)

        img_w, img_h = 1000, 1000
        result = assess_road_health(detections, img_w, img_h)

        self.assertEqual(result["severity"], "Medium")  # 5 <= 6.7 <= 12
        self.assertTrue(31.0 <= result["road_health_score"] <= 60.0)
        self.assertEqual(result["condition_label"], "Poor")

    def test_minor_damage_fair(self):
        """Minor damage resulting in 'Fair' condition (61-80)."""
        # DI = 3.0, Coverage = 10%
        # Score = 100 - (3.0 * 3) - (10 * 1.2) = 100 - 9 - 12 = 79.0 -> "Fair"
        detections = [
            {"class_code": "D10", "confidence": 0.80, "bbox": [100, 100, 400, 200]}, # 1.5 * 0.8 = 1.20, 30,000 px
            {"class_code": "D00", "confidence": 0.80, "bbox": [500, 100, 600, 800]}, # 1.0 * 0.8 = 0.80, 70,000 px
        ]
        # Total box area = 100,000 px -> Coverage = 10.0%
        # DI = 2.00
        # Score = 100 - (2.00 * 3) - (10.0 * 1.2) = 100 - 6 - 12 = 82? Wait: 82 would be Good!
        # Let's adjust slightly:
        detections.append(
            {"class_code": "D10", "confidence": 0.70, "bbox": [200, 400, 400, 500]} # 1.5 * 0.7 = 1.05, 20,000 px
        )
        # Total box area = 120,000 px -> Coverage = 12.0%
        # DI = 3.05
        # Score = 100 - (3.05 * 3) - (12.0 * 1.2) = 100 - 9.15 - 14.40 = 76.45 -> "Fair" (61-80)

        img_w, img_h = 1000, 1000
        result = assess_road_health(detections, img_w, img_h)

        self.assertEqual(result["severity"], "Low")  # DI 3.05 < 5
        self.assertTrue(61.0 <= result["road_health_score"] <= 80.0)
        self.assertEqual(result["condition_label"], "Fair")

    def test_coverage_capping(self):
        """Coverage percentage must never exceed 100% even with overlapping large boxes."""
        detections = [
            {"class_code": "D40", "confidence": 0.9, "bbox": [0, 0, 800, 800]},
            {"class_code": "D40", "confidence": 0.9, "bbox": [100, 100, 900, 900]},
        ]
        # Sum of box areas > 1,000,000
        cov = compute_coverage(detections, 1000, 1000)
        self.assertEqual(cov, 100.0)

    def test_score_clipping_bounds(self):
        """Score must never drop below 0.0 or exceed 100.0."""
        score_min = compute_road_health_score(damage_index=50.0, coverage_pct=100.0)
        self.assertEqual(score_min, 0.0)

        score_max = compute_road_health_score(damage_index=0.0, coverage_pct=0.0)
        self.assertEqual(score_max, 100.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
