"""API contract tests — these shapes are what js/data.js depends on."""
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Profile, Project


class PortfolioApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        Profile.objects.create(
            pk=1, name="Soroush Eghdami", username="soroush",
            role="Python Backend Developer", tagline="Django",
            bio=["hello"], location="404", education="CE",
        )
        Project.objects.create(
            slug="rag", name="R.A.G", desc="RAG app",
            stack=["Python"], link="https://github.com/x/rag",
            stars=3, featured=True,
        )

    def setUp(self):
        self.client = APIClient()

    def test_profile_shape(self):
        data = self.client.get("/api/profile/").json()
        for key in ("name", "username", "role", "bio", "fun_fact"):
            self.assertIn(key, data)

    def test_projects_shape(self):
        data = self.client.get("/api/projects/").json()
        self.assertEqual(len(data), 1)
        for key in ("slug", "name", "desc", "stack", "link", "stars", "featured"):
            self.assertIn(key, data[0])

    def test_contact_happy_path(self):
        with patch("portfolio.views.send_mail") as mail:
            r = self.client.post("/api/contact/", {
                "name": " Ada ", "email": "ada@example.com",
                "message": "Hello, this is a real message!",
            }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()["ok"])
        mail.assert_called_once()

    def test_contact_validation(self):
        r = self.client.post("/api/contact/", {
            "name": "A", "email": "not-an-email", "message": "short",
        }, format="json")
        self.assertEqual(r.status_code, 400)
        errors = r.json()["errors"]
        self.assertIn("name", errors)
        self.assertIn("email", errors)
        self.assertIn("message", errors)

    def test_contact_honeypot_rejected(self):
        r = self.client.post("/api/contact/", {
            "name": "Bot", "email": "bot@example.com",
            "message": "Buy cheap watches now free money!!!",
            "website": "http://spam.example",
        }, format="json")
        self.assertEqual(r.status_code, 400)

    def test_meta(self):
        data = self.client.get("/api/meta/").json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["projects"], 1)
