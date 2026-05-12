"""World Cup 2026 Panini album template seed data — 980 stickers total.

Sticker code format: PREFIX + NUMBER (no dash), e.g. ARG1, MEX20, FWC5.
Structure:
  - 1 intro sticker: 00 (Panini logo)
  - 19 tournament stickers: FWC1–FWC19
  - 48 teams × 20 stickers = 960
  Total: 980
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

# 48 teams in alphabetical order by code (matches official album ordering)
_TEAMS = [
    ("ALG", "Argelia"),
    ("ARG", "Argentina"),
    ("AUS", "Australia"),
    ("AUT", "Austria"),
    ("BEL", "Bélgica"),
    ("BIH", "Bosnia y Herzegovina"),
    ("BRA", "Brasil"),
    ("CAN", "Canadá"),
    ("CIV", "Costa de Marfil"),
    ("COD", "Congo DR"),
    ("COL", "Colombia"),
    ("CPV", "Cabo Verde"),
    ("CRO", "Croacia"),
    ("CUW", "Curazao"),
    ("CZE", "Chequia"),
    ("ECU", "Ecuador"),
    ("EGY", "Egipto"),
    ("ENG", "Inglaterra"),
    ("ESP", "España"),
    ("FRA", "Francia"),
    ("GER", "Alemania"),
    ("GHA", "Ghana"),
    ("HAI", "Haití"),
    ("IRN", "Irán"),
    ("IRQ", "Irak"),
    ("JOR", "Jordania"),
    ("JPN", "Japón"),
    ("KOR", "Corea del Sur"),
    ("KSA", "Arabia Saudita"),
    ("MAR", "Marruecos"),
    ("MEX", "México"),
    ("NED", "Países Bajos"),
    ("NOR", "Noruega"),
    ("NZL", "Nueva Zelanda"),
    ("PAN", "Panamá"),
    ("PAR", "Paraguay"),
    ("POR", "Portugal"),
    ("QAT", "Qatar"),
    ("RSA", "Sudáfrica"),
    ("SCO", "Escocia"),
    ("SEN", "Senegal"),
    ("SUI", "Suiza"),
    ("SWE", "Suecia"),
    ("TUN", "Túnez"),
    ("TUR", "Türkiye"),
    ("URU", "Uruguay"),
    ("USA", "Estados Unidos"),
    ("UZB", "Uzbekistán"),
]


def build_wc2026_sections() -> list[TemplateSection]:
    """Returns all 49 sections for the FIFA World Cup 2026 Panini album (980 stickers)."""
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

    # ── 48 selecciones × 20 láminas ──────────────────────────────────────────
    for order, (prefix, name) in enumerate(_TEAMS, start=1):
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
            stickers=stickers,
        ))
        pos += 20

    return sections  # total stickers = 20 + 48×20 = 980


WORLD_CUP_2026_TEMPLATE = {
    "name": "FIFA World Cup 2026™",
    "description": (
        "Álbum oficial Panini del Mundial de Fútbol 2026 — "
        "48 selecciones, 980 láminas. "
        "Sede: Canadá, México y Estados Unidos."
    ),
}
