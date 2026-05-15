"""World Cup 2026 Panini album template seed data — 994 stickers total.

Sticker code format: PREFIX + NUMBER (no dash), e.g. ARG1, MEX20, FWC5.
Structure:
  - 1 intro sticker: 00 (Panini logo)
  - 19 tournament stickers: FWC1–FWC19
  - 14 Coca-Cola special stickers: CC1–CC14
  - 48 teams × 20 stickers = 960
  Total: 994
"""
from src.domain.entities.models import TemplateSection, TemplateSticker

_TEAM_LABELS = [
    "Escudo",
    "Foto grupal",
    "Jugador 1",
    "Jugador 2",
    "Jugador 3",
    "Jugador 4",
    "Jugador 5",
    "Jugador 6",
    "Jugador 7",
    "Jugador 8",
    "Jugador 9",
    "Jugador 10",
    "Jugador 11",
    "Jugador 12",
    "Jugador 13",
    "Jugador 14",
    "Jugador 15",
    "Jugador 16",
    "Jugador 17",
    "Jugador 18",
]

# 48 teams ordered by FIFA group (matches official Panini album ordering)
# Each entry: (code_prefix, name, group)
_TEAMS = [
    # Grupo A
    ("MEX", "México",              "A"),
    ("RSA", "Sudáfrica",           "A"),
    ("KOR", "Corea del Sur",       "A"),
    ("CZE", "Chequia",             "A"),
    # Grupo B
    ("CAN", "Canadá",              "B"),
    ("BIH", "Bosnia y Herzegovina","B"),
    ("QAT", "Qatar",               "B"),
    ("SUI", "Suiza",               "B"),
    # Grupo C
    ("BRA", "Brasil",              "C"),
    ("MAR", "Marruecos",           "C"),
    ("HAI", "Haití",               "C"),
    ("SCO", "Escocia",             "C"),
    # Grupo D
    ("USA", "Estados Unidos",      "D"),
    ("PAR", "Paraguay",            "D"),
    ("AUS", "Australia",           "D"),
    ("TUR", "Türkiye",             "D"),
    # Grupo E
    ("GER", "Alemania",            "E"),
    ("CUW", "Curazao",             "E"),
    ("CIV", "Costa de Marfil",     "E"),
    ("ECU", "Ecuador",             "E"),
    # Grupo F
    ("NED", "Países Bajos",        "F"),
    ("JPN", "Japón",               "F"),
    ("SWE", "Suecia",              "F"),
    ("TUN", "Túnez",               "F"),
    # Grupo G
    ("BEL", "Bélgica",             "G"),
    ("EGY", "Egipto",              "G"),
    ("IRN", "Irán",                "G"),
    ("NZL", "Nueva Zelanda",       "G"),
    # Grupo H
    ("ESP", "España",              "H"),
    ("CPV", "Cabo Verde",          "H"),
    ("KSA", "Arabia Saudita",      "H"),
    ("URU", "Uruguay",             "H"),
    # Grupo I
    ("FRA", "Francia",             "I"),
    ("SEN", "Senegal",             "I"),
    ("IRQ", "Irak",                "I"),
    ("NOR", "Noruega",             "I"),
    # Grupo J
    ("ARG", "Argentina",           "J"),
    ("ALG", "Argelia",             "J"),
    ("AUT", "Austria",             "J"),
    ("JOR", "Jordania",            "J"),
    # Grupo K
    ("POR", "Portugal",            "K"),
    ("COD", "Congo DR",            "K"),
    ("UZB", "Uzbekistán",          "K"),
    ("COL", "Colombia",            "K"),
    # Grupo L
    ("ENG", "Inglaterra",          "L"),
    ("CRO", "Croacia",             "L"),
    ("GHA", "Ghana",               "L"),
    ("PAN", "Panamá",              "L"),
]

_GROUP_MAP: dict[str, str] = {prefix: grp for prefix, _, grp in _TEAMS}
_ORDER_MAP: dict[str, int] = {prefix: i for i, (prefix, _, _grp) in enumerate(_TEAMS, start=1)}


_CC_LABELS = [
    "Coca-Cola x FIFA 1",
    "Coca-Cola x FIFA 2",
    "Coca-Cola x FIFA 3",
    "Coca-Cola x FIFA 4",
    "Coca-Cola x FIFA 5",
    "Coca-Cola x FIFA 6",
    "Coca-Cola x FIFA 7",
    "Coca-Cola x FIFA 8",
    "Coca-Cola x FIFA 9",
    "Coca-Cola x FIFA 10",
    "Coca-Cola x FIFA 11",
    "Coca-Cola x FIFA 12",
    "Coca-Cola x FIFA 13",
    "Coca-Cola x FIFA 14",
]


def build_wc2026_sections() -> list[TemplateSection]:
    """Returns all 50 sections for the FIFA World Cup 2026 Panini album (994 stickers)."""
    sections: list[TemplateSection] = []
    pos = 1

    # ── Sección introductoria (20 láminas: 00 + FWC1–FWC19) ──────────────────
    intro_stickers = [
        TemplateSticker(code="00", label="Logo Panini", position=pos),
    ] + [
        TemplateSticker(
            code=f"FWC{i}",
            label=[
                "Emblema oficial",
                "Mascota oficial",
                "Lema oficial",
                "Balón oficial",
                "Trofeo FIFA",
                "Sede: Canadá",
                "Sede: México",
                "Sede: Estados Unidos",
                "Campeones 1930 Uruguay",
                "Campeones 1934 Italia",
                "Campeones 1938 Italia",
                "Campeones 1950 Uruguay",
                "Campeones 1954 Alemania",
                "Campeones 1958 Brasil",
                "Campeones 1962 Brasil",
                "Campeones 1966 Inglaterra",
                "Campeones 1970 Brasil",
                "Campeones 1974 Alemania",
                "Campeones 1978 Argentina",
            ][i - 1],
            position=pos + i,
        )
        for i in range(1, 20)
    ]
    sections.append(TemplateSection(
        id=0, template_id=0,
        name="FIFA World Cup 2026",
        code_prefix="FWC",
        order=0,
        stickers=intro_stickers,
    ))
    pos += 20  # 1 (00) + 19 (FWC1–FWC19)

    # ── Sección Coca-Cola (14 láminas: CC1–CC14) ─────────────────────────────
    cc_stickers = [
        TemplateSticker(code=f"CC{i}", label=_CC_LABELS[i - 1], position=pos + (i - 1))
        for i in range(1, 15)
    ]
    sections.append(TemplateSection(
        id=0, template_id=0,
        name="Coca-Cola",
        code_prefix="CC",
        order=49,
        stickers=cc_stickers,
    ))
    pos += 14  # CC1–CC14

    # ── 48 selecciones × 20 láminas ──────────────────────────────────────────
    for order, (prefix, name, group) in enumerate(_TEAMS, start=1):
        stickers = [
            TemplateSticker(
                code=f"{prefix}{i}",
                label=_TEAM_LABELS[i - 1],
                position=pos + (i - 1),
            )
            for i in range(1, 21)
        ]
        sections.append(TemplateSection(
            id=0, template_id=0,
            name=name,
            code_prefix=prefix,
            order=order,
            group=group,
            stickers=stickers,
        ))
        pos += 20

    return sections  # total stickers = 20 + 14 + 48×20 = 994


WORLD_CUP_2026_TEMPLATE = {
    "name": "FIFA World Cup 2026™",
    "description": (
        "Álbum oficial Panini del Mundial de Fútbol 2026 — "
        "48 selecciones, 994 láminas. "
        "Sede: Canadá, México y Estados Unidos."
    ),
}
