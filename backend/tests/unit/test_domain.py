"""Unit tests for domain entities — zero infrastructure needed."""
import pytest
from datetime import datetime

from src.domain.entities.models import Album, Sticker, StickerStatus


def test_sticker_cycle_missing_to_have() -> None:
    sticker = Sticker(id=1, album_id=1, user_id=1, number=5, status=StickerStatus.MISSING)
    sticker.cycle_status()
    assert sticker.status == StickerStatus.HAVE


def test_sticker_cycle_have_to_duplicate() -> None:
    sticker = Sticker(id=1, album_id=1, user_id=1, number=5, status=StickerStatus.HAVE)
    sticker.cycle_status()
    assert sticker.status == StickerStatus.DUPLICATE


def test_sticker_cycle_duplicate_to_missing() -> None:
    sticker = Sticker(id=1, album_id=1, user_id=1, number=5, status=StickerStatus.DUPLICATE)
    sticker.cycle_status()
    assert sticker.status == StickerStatus.MISSING


def test_album_completion_percentage() -> None:
    album = Album(id=1, name="Mundial 2026", total_stickers=670, owner_id=1)
    assert album.completion_percentage(0) == 0.0
    assert album.completion_percentage(335) == 50.0
    assert album.completion_percentage(670) == 100.0


def test_album_completion_zero_total() -> None:
    album = Album(id=1, name="Empty", total_stickers=0, owner_id=1)
    assert album.completion_percentage(0) == 0.0
