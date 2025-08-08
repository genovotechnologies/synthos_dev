import pytest

def test_basic():
    """Basic test to ensure pytest works"""
    assert True

def test_math():
    """Test basic math operations"""
    assert 2 + 2 == 4

def test_string():
    """Test string operations"""
    assert "hello" + " world" == "hello world"

def test_list():
    """Test list operations"""
    test_list = [1, 2, 3]
    assert len(test_list) == 3
    assert test_list[0] == 1 