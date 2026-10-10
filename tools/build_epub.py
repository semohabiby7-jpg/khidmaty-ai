import os, re, zipfile, uuid, html
from datetime import datetime, timezone

BOOKS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "books")

AR_BOOK = {
    "dir": "mind-power",
    "out": "Mind-Power-AR.epub",
    "title": "قوة العقل",
    "lang": "ar",
    "dir_attr": "rtl",
    "description": "كيف تتحكم في أفكارك بإعادة برمجة عقلك وتبني عاداتك لتقودك لحياة أقوى — دليل تشغيل عملي للدماغ من المؤلف محمد إسماعيل عبد العزيز.",
    "author": "MOHAMED ISMAIL ABDELAZIZ",
    "publisher": "KHIDMATY AI",
    "files": [
        "00-المقدمة.md",
        "01-عقلك-مش-إنت.md",
        "02-استرد-دماغك.md",
        "03-الكلام-اللي-بتقوله-لنفسك.md",
        "04-دماغك-بيصدق-اللي-بيتكرر.md",
        "05-قاعدة-الدقيقة-الواحدة.md",
        "06-مين-اللي-بيشحن-مين.md",
        "07-قصص-واقعية.md",
        "08-النهاية.md",
    ],
    "cover": "cover-kindle.jpg",
}

EN_BOOK = {
    "dir": "mind-power-en",
    "out": "Power-Of-Mind-EN.epub",
    "title": "POWER OF MIND",
    "lang": "en",
    "dir_attr": "ltr",
    "description": "How to control your thoughts, reprogram your mind, and build habits that lead you to a stronger life — a practical owner's manual for your brain by Mohamed Ismail Abdelaziz.",
    "author": "MOHAMED ISMAIL ABDELAZIZ",
    "publisher": "KHIDMATY AI",
    "files": [
        "00-intro.md",
        "01-your-mind-is-not-you.md",
        "02-reclaim-your-mind.md",
        "03-the-words-you-say-to-yourself.md",
        "04-your-mind-believes-what-gets-repeated.md",
        "05-the-one-minute-rule.md",
        "06-who-charges-whom.md",
        "07-real-stories.md",
        "08-the-end.md",
    ],
    "cover": "cover-kindle.jpg",
}


EN2_BOOK = {
    "dir": "mind-power-2-en",
    "out": "Power-Of-Mind-2-EN.epub",
    "title": "POWER OF MIND 2",
    "lang": "en",
    "dir_attr": "ltr",
    "description": "After you reclaimed your mind — how to lead your life: destination, decision, endurance, impact. The second part of Power of Mind by Mohamed Ismail Abdelaziz.",
    "author": "MOHAMED ISMAIL ABDELAZIZ",
    "publisher": "KHIDMATY AI",
    "files": [
        "00-introduction.md",
        "01-where-to.md",
        "02-one-decision.md",
        "03-patience-is-continuation.md",
        "04-storm-time.md",
        "05-who-is-around-you.md",
        "06-your-power-in-whose-service.md",
        "07-stories-of-part-two.md",
        "08-the-end.md",
    ],
    "cover": "cover-kindle.jpg",
}

def esc(t):
    return html.escape(t, quote=False)

def inline(t):
    t = esc(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return t

def md_to_xhtml(md_text):
    out = []
    title = ""
    para = []
    list_mode = None

    def flush_para():
        if para:
            out.append("<p>" + " ".join(para) + "</p>")
            para.clear()

    def close_list():
        nonlocal list_mode
        if list_mode:
            out.append("</" + list_mode + ">")
            list_mode = None

    for raw in md_text.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            flush_para()
            close_list()
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            flush_para()
            close_list()
            lvl = len(m.group(1))
            if lvl == 1 and not title:
                title = m.group(2).strip()
            out.append("<h%d>%s</h%d>" % (lvl, inline(m.group(2)), lvl))
            continue
        if re.match(r"^---+$", line.strip()):
            flush_para()
            close_list()
            out.append("<hr/>")
            continue
        m = re.match(r"^-\s+(.*)$", line)
        if m:
            flush_para()
            if list_mode != "ul":
                close_list()
                out.append("<ul>")
                list_mode = "ul"
            out.append("<li>" + inline(m.group(1)) + "</li>")
            continue
        m = re.match(r"^(\d+)[.)]\s+(.*)$", line)
        if m:
            flush_para()
            if list_mode != "ol":
                close_list()
                out.append("<ol>")
                list_mode = "ol"
            out.append("<li>" + inline(m.group(2)) + "</li>")
            continue
        close_list()
        para.append(inline(line.strip()))

    flush_para()
    close_list()
    return title, "\n".join(out)

def page(lang, dir_attr, title, body, extra_head=""):
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html>\n'
        '<html xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:epub="http://www.idpf.org/2007/ops" '
        'lang="%s" xml:lang="%s" dir="%s">\n'
        "<head>\n<title>%s</title>\n"
        '<link rel="stylesheet" type="text/css" href="../style.css"/>\n%s\n</head>\n'
        '<body dir="%s">\n%s\n</body>\n</html>\n'
    ) % (lang, lang, dir_attr, esc(title), extra_head, dir_attr, body)

CSS = """body{line-height:1.85;margin:4% 5%;}
h1{font-size:1.55em;text-align:center;margin:1.4em 0 1em;}
h2{font-size:1.28em;margin:1.3em 0 .6em;}
h3{font-size:1.1em;margin:1.1em 0 .5em;}
p{margin:0 0 .75em 0;text-align:justify;}
ul,ol{margin:.4em 1.6em .9em;}
li{margin:.35em 0;}
strong{font-weight:bold;}
hr{border:0;border-top:1px solid #999;margin:1.5em 0;}
.cover-page{margin:0;padding:0;text-align:center;}
.cover-page img{max-width:100%;height:auto;}"""

CONTAINER = """<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>"""

def build(book):
    base = os.path.join(BOOKS_DIR, book["dir"])
    chapters = []
    for idx, fname in enumerate(book["files"]):
        with open(os.path.join(base, fname), encoding="utf-8") as f:
            md = f.read()
        title, body = md_to_xhtml(md)
        href = "text/ch%02d.xhtml" % idx
        chapters.append((title or fname, href, body))

    book_id = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, "khidmatyai.com/" + book["out"]))
    modified = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    manifest_items = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
        '<item id="css" href="style.css" media-type="text/css"/>',
        '<item id="coverpage" href="cover.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="cover-img" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>',
    ]
    spine = ['<itemref idref="coverpage"/>']
    nav_lis = []
    ncx_points = []
    for i, (title, href, body) in enumerate(chapters):
        cid = "ch%02d" % i
        manifest_items.append('<item id="%s" href="%s" media-type="application/xhtml+xml"/>' % (cid, href))
        spine.append('<itemref idref="%s"/>' % cid)
        nav_lis.append('<li><a href="%s">%s</a></li>' % (href, esc(title)))
        ncx_points.append(
            '<navPoint id="np%d" playOrder="%d"><navLabel><text>%s</text></navLabel>'
            '<content src="%s"/></navPoint>' % (i + 1, i + 1, esc(title), href)
        )

    opf = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="%s">\n'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
        '<dc:identifier id="bookid">%s</dc:identifier>\n'
        "<dc:title>%s</dc:title>\n"
        '<dc:creator id="creator">%s</dc:creator>\n'
        '<meta refines="#creator" property="role" scheme="marc:relators">aut</meta>\n'
        "<dc:language>%s</dc:language>\n"
        "<dc:publisher>%s</dc:publisher>\n"
        "<dc:description>%s</dc:description>\n"
        "<dc:date>%s</dc:date>\n"
        '<meta property="dcterms:modified">%s</meta>\n'
        '<meta name="cover" content="cover-img"/>\n'
        "</metadata>\n<manifest>\n%s\n</manifest>\n"
        '<spine toc="ncx">\n%s\n</spine>\n</package>\n'
    ) % (
        book["lang"], book_id, esc(book["title"]), esc(book["author"]), book["lang"],
        esc(book["publisher"]), esc(book["description"]), modified[:10], modified,
        "\n".join(manifest_items), "\n".join(spine),
    )

    nav = page(book["lang"], book["dir_attr"], book["title"],
               '<nav epub:type="toc" id="toc">\n<ol>\n%s\n</ol>\n</nav>' % "\n".join(nav_lis),
               extra_head='<meta name="viewport" content="width=device-width"/>')
    nav = nav.replace('<body dir="%s">' % book["dir_attr"],
                      '<body dir="%s" epub:type="bodymatter">' % book["dir_attr"])

    ncx = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="%s">\n'
        "<head>\n"
        '<meta name="dtb:uid" content="%s"/>\n'
        '<meta name="dtb:depth" content="1"/>\n'
        "</head>\n<docTitle><text>%s</text></docTitle>\n<navMap>\n%s\n</navMap>\n</ncx>\n"
    ) % (book["lang"], book_id, esc(book["title"]), "\n".join(ncx_points))

    cover_body = '<div class="cover-page"><img src="images/cover.jpg" alt="%s"/></div>' % esc(book["title"])
    cover_page = page(book["lang"], book["dir_attr"], book["title"], cover_body)

    out_path = os.path.join(base, book["out"])
    with zipfile.ZipFile(out_path, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", CONTAINER)
        z.writestr("OEBPS/content.opf", opf)
        z.writestr("OEBPS/nav.xhtml", nav)
        z.writestr("OEBPS/toc.ncx", ncx)
        z.writestr("OEBPS/style.css", CSS)
        z.writestr("OEBPS/cover.xhtml", cover_page)
        with open(os.path.join(base, book["cover"]), "rb") as f:
            z.writestr("OEBPS/images/cover.jpg", f.read())
        for title, href, body in chapters:
            z.writestr("OEBPS/" + href, page(book["lang"], book["dir_attr"], title, body))
    return out_path, len(chapters)

if __name__ == "__main__":
    for book in (AR_BOOK, EN_BOOK, EN2_BOOK):
        path, n = build(book)
        print("built:", path, "chapters:", n, "size KB:", round(os.path.getsize(path) / 1024))
