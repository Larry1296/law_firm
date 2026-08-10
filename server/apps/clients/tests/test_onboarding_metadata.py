from django.test import SimpleTestCase

from apps.clients.onboarding_metadata import CANONICAL_CLIENT_TYPES, onboarding_metadata


class OnboardingMetadataTests(SimpleTestCase):
    def test_only_canonical_types_are_selectable(self):
        metadata = onboarding_metadata()
        selectable = {item["value"] for item in metadata["legal_client_types"]}
        self.assertEqual(selectable, set(CANONICAL_CLIENT_TYPES))
        self.assertNotIn("EDUCATIONAL_INSTITUTION", selectable)
        self.assertNotIn("SACCO", selectable)
        self.assertNotIn("NGO", selectable)
        self.assertNotIn("REPRESENTATIVE", selectable)

    def test_every_choice_has_human_label(self):
        metadata = onboarding_metadata()
        for group, values in metadata.items():
            if isinstance(values, list) and values and isinstance(values[0], dict):
                self.assertTrue(all(item.get("label") for item in values), group)

    def test_education_matrix_is_complete(self):
        metadata = onboarding_metadata()
        self.assertEqual(len(metadata["university_categories"]), 8)
        self.assertEqual(len(metadata["tvet_categories"]), 5)
        self.assertIn("KENYA_CBE_CBC", {item["value"] for item in metadata["curriculum_frameworks"]})
