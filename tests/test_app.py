import copy
import json

import pytest
from fastapi.testclient import TestClient

from src import app as application


@pytest.fixture(autouse=True)
def client_and_reset():
    # snapshot activities and restore after each test to keep tests isolated
    orig = copy.deepcopy(application.activities)
    client = TestClient(application.app)
    yield client
    application.activities.clear()
    application.activities.update(orig)


def test_get_activities(client_and_reset):
    r = client_and_reset.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # basic expectation: Chess Club exists
    assert "Chess Club" in data


def test_signup_and_duplicate(client_and_reset):
    email = "alice@example.com"
    activity = "Chess Club"

    # signup should succeed
    r = client_and_reset.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # signing up again should error
    r2 = client_and_reset.post(f"/activities/{activity}/signup", params={"email": email})
    assert r2.status_code == 400
    assert "already" in r2.json().get("detail", "").lower()


def test_unregister_and_errors(client_and_reset):
    email = "bob@example.com"
    activity = "Chess Club"

    # unregistering a non-registered user should error
    r = client_and_reset.post(f"/activities/{activity}/unregister", params={"email": email})
    assert r.status_code == 400

    # register then unregister
    r2 = client_and_reset.post(f"/activities/{activity}/signup", params={"email": email})
    assert r2.status_code == 200

    r3 = client_and_reset.post(f"/activities/{activity}/unregister", params={"email": email})
    assert r3.status_code == 200
    assert "Unregistered" in r3.json().get("message", "")
