#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ترقية أغلفة المتجر القديمة (683×1024) إلى 1000×1500.

- لو المصدر 1600×2560 هو نفس الرسم (RMSE منخفض) → نعيد التوليد من المصدر الحقيقي.
- لو الرسم مختلف → نكبّر الملف الحالي بجودة عالية + sharpen، بدون تغيير الشكل.
"""
import os
from PIL import Image, ImageFilter
import numpy as np

M = "/home/user/workspace/maktabat-amazon/covers/"
S = "/home/user/workspace/khidmaty-ai-main/"
TARGET = (1000, 1500)

# (ملف المتجر, مصدر 1600×2560, هل نثق إنه نفس الرسم)
JOBS = [
    ("books/mind-power/cover.webp", "cover-mp1-ar.jpg", False),
    ("books/mind-power-en/cover.webp", "cover-mp1-en-v2.jpg", False),
    ("books/mind-power-2/cover.webp", "cover-mp2-ar.jpg", True),
    ("books/mind-power-2-en/cover.webp", "cover-mp2-en.jpg", True),
    ("books/mind-power-3/cover.webp", "cover-mp3-ar.jpg", True),
    ("books/mind-power-3/cover-en.webp", "cover-mp3-en.jpg", True),
    ("books/mind-power-4/cover.webp", "cover-mp4-ar.jpg", False),
    ("books/mind-power-4/cover-en.webp", "cover-mp4-en.jpg", True),
    ("books/mind-power-5/cover.webp", "cover-mp5-ar.jpg", True),
    ("books/mind-power-5/cover-en.webp", "cover-mp5-en.jpg", True),
    ("books/ai-tools-content-writers/cover.webp", "cover-aitools-content.jpg", False),
    ("books/smart-future/cover-final.webp", "cover-smartfuture.jpg", False),
    ("img-cover.jpg", "cover-aitools.jpg", True),
]


def from_source(src):
    """1600×2560 → قص مركزي لنسبة 2:3 → 1000×1500."""
    im = Image.open(src).convert("RGB")
    w = 1000
    h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    top = (h - TARGET[1]) // 2
    return im.crop((0, top, w, top + TARGET[1]))


def crop23(im):
    """قص مركزي لأي صورة لنسبة 2:3 قبل المقارنة (المصادر 1600×2560 نسبتهم مختلفة)."""
    w, h = im.size
    target_h = round(w * 3 / 2)
    if h <= target_h:
        return im.resize((w, target_h))
    top = (h - target_h) // 2
    return im.crop((0, top, w, top + target_h))


def upscale(cur):
    im = Image.open(cur).convert("RGB").resize(TARGET, Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=3))


def rmse(a, b):
    x = np.asarray(crop23(a).resize((300, 450)), dtype=float)
    y = np.asarray(crop23(b).resize((300, 450)), dtype=float)
    return float(np.sqrt(((x - y) ** 2).mean()))


for rel, src_name, trusted in JOBS:
    cur_path = S + rel
    cur_img = Image.open(cur_path).convert("RGB")
    before = cur_img.size
    if before[0] >= 1200:
        print(f"{rel:44s} {before} — دقته عالية أصلاً، سيبناه زي ما هو")
        continue
    if trusted:
        src = M + src_name
        candidate = from_source(src)
        # تحقق أخير قبل الكتابة: لازم يطابق الشكل الحالي
        if rmse(candidate, cur_img) > 20:
            print(f"! {rel}: المصدر مختلف — استخدمنا التكبير بدل الاستبدال")
            out, how = upscale(cur_path), "upscale"
        else:
            out, how = candidate, "source"
    else:
        out, how = upscale(cur_path), "upscale"

    if rel.endswith(".jpg"):
        out.save(cur_path, "JPEG", quality=90, optimize=True, progressive=True)
    else:
        out.save(cur_path, "WEBP", quality=88, method=6)
    print(f"{rel:44s} {before} -> {out.size} [{how}]")
