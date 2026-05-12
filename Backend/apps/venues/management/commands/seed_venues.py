"""
Management command: seed_venues

Creates 25 realistic UK venues and computes their embeddings via the
OpenAI text-embedding-3-small API so that the AI semantic search works
immediately after setup.

Usage:
    python manage.py seed_venues
    python manage.py seed_venues --no-embeddings   # skip OpenAI calls
    python manage.py seed_venues --clear           # wipe existing data first
"""

import time
import urllib.request
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

VENUES_DATA = [
    {
        "name": "The Grand Pavilion",
        "city": "London",
        "capacity": 500,
        "price_per_day": "4800.00",
        "description": (
            "An opulent Victorian ballroom in the heart of London, "
            "featuring original stucco ceilings, a sprung dance floor, "
            "and state-of-the-art AV facilities. Ideal for galas, product launches, "
            "and corporate award ceremonies."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage"],
    },
    {
        "name": "Canary Wharf Conference Centre",
        "city": "London",
        "capacity": 300,
        "price_per_day": "3500.00",
        "description": (
            "A sleek glass-walled conference centre overlooking the Thames. "
            "Modular breakout rooms, high-speed fibre, and on-site catering make it "
            "the top choice for tech summits and investor days."
        ),
        "amenities": ["wifi", "catering", "av", "breakout_rooms"],
    },
    {
        "name": "Shoreditch Loft Studios",
        "city": "London",
        "capacity": 120,
        "price_per_day": "1800.00",
        "description": (
            "Industrial-chic raw brick loft in Shoreditch with exposed steel beams "
            "and floor-to-ceiling windows. Popular for creative workshops, brand "
            "activations, and intimate music events."
        ),
        "amenities": ["wifi", "av", "stage"],
    },
    {
        "name": "Kensington Manor",
        "city": "London",
        "capacity": 200,
        "price_per_day": "5000.00",
        "description": (
            "A Grade-I listed Georgian mansion with manicured gardens, a minstrels "
            "gallery, and a licensed bar. Perfect for weddings, charity dinners, "
            "and high-profile receptions."
        ),
        "amenities": ["wifi", "parking", "catering", "bar", "garden"],
    },
    {
        "name": "Manchester Central Convention Complex",
        "city": "Manchester",
        "capacity": 500,
        "price_per_day": "4200.00",
        "description": (
            "The North's premier exhibition and congress venue, converted from a "
            "Victorian railway station. Spanning 10,000 m² of flexible event space "
            "with full technical production support."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage", "loading_bay"],
    },
    {
        "name": "Ancoats Warehouse",
        "city": "Manchester",
        "capacity": 250,
        "price_per_day": "2000.00",
        "description": (
            "A beautifully restored Victorian cotton mill turned event space in "
            "the vibrant Ancoats neighbourhood. Rough concrete walls, exposed beams, "
            "and flexible layout suit everything from film premieres to hackathons."
        ),
        "amenities": ["wifi", "catering", "av"],
    },
    {
        "name": "The Northern Quarter Hub",
        "city": "Manchester",
        "capacity": 80,
        "price_per_day": "900.00",
        "description": (
            "Compact co-working-style event space in the heart of the Northern Quarter. "
            "Ideal for start-up pitch events, training days, and intimate networking "
            "sessions."
        ),
        "amenities": ["wifi", "av"],
    },
    {
        "name": "Victoria Warehouse",
        "city": "Manchester",
        "capacity": 450,
        "price_per_day": "3800.00",
        "description": (
            "An iconic 1920s cotton-spinning warehouse near Old Trafford. "
            "Two independent halls, world-class sound system, and a large outdoor "
            "yard for festivals, concerts, and large-scale brand experiences."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage", "outdoor_space"],
    },
    {
        "name": "Birmingham ICC",
        "city": "Birmingham",
        "capacity": 500,
        "price_per_day": "4500.00",
        "description": (
            "The International Convention Centre on Brindleyplace offers 11 halls "
            "and a 1,300-seat Symphony Hall. A landmark destination for national "
            "trade shows, political party conferences, and major corporate congresses."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage", "accessibility"],
    },
    {
        "name": "The Bond Company",
        "city": "Birmingham",
        "capacity": 180,
        "price_per_day": "1600.00",
        "description": (
            "A converted Victorian bonded warehouse with original brick arches and "
            "contemporary interiors. Housed in the Digbeth creative quarter, popular "
            "for agency away-days, design conferences, and product reveals."
        ),
        "amenities": ["wifi", "catering", "av", "breakout_rooms"],
    },
    {
        "name": "Custard Factory",
        "city": "Birmingham",
        "capacity": 350,
        "price_per_day": "2800.00",
        "description": (
            "The Custard Factory is a multi-use creative hub inside the old Bird's "
            "Custard factory in Digbeth. Eleven distinct spaces including a rooftop "
            "terrace and underground club room, ideal for festivals and immersive events."
        ),
        "amenities": ["wifi", "catering", "av", "outdoor_space", "bar"],
    },
    {
        "name": "Edinburgh International Conference Centre",
        "city": "Edinburgh",
        "capacity": 500,
        "price_per_day": "4700.00",
        "description": (
            "Scotland's flagship conference venue, minutes from Edinburgh Castle. "
            "Award-winning sustainability credentials, 22 flexible rooms, and "
            "dedicated delegate registration areas for congresses and trade events."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage", "accessibility"],
    },
    {
        "name": "The Signet Library",
        "city": "Edinburgh",
        "capacity": 100,
        "price_per_day": "3200.00",
        "description": (
            "One of Edinburgh's most spectacular private dining and event venues, "
            "nestled in the Old Town. The colonnaded Upper Library hall creates an "
            "unforgettable setting for intimate dinners and exclusive receptions."
        ),
        "amenities": ["wifi", "catering", "bar"],
    },
    {
        "name": "Dynamic Earth",
        "city": "Edinburgh",
        "capacity": 400,
        "price_per_day": "3900.00",
        "description": (
            "A purpose-built event venue within the iconic white dome at the foot of "
            "Arthur's Seat. Impressive geodesic structure, immersive digital displays, "
            "and 11 versatile event spaces for anything from AGMs to gala dinners."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage"],
    },
    {
        "name": "Titanic Belfast",
        "city": "Belfast",
        "capacity": 500,
        "price_per_day": "4400.00",
        "description": (
            "The world's largest Titanic visitor experience doubles as a breath-taking "
            "event venue. The vast Titanic Suite overlooks the historic slipways and "
            "provides an extraordinary backdrop for large banquets and conferences."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage"],
    },
    {
        "name": "The MAC Belfast",
        "city": "Belfast",
        "capacity": 150,
        "price_per_day": "1400.00",
        "description": (
            "A multi-arts centre in the Cathedral Quarter with two theatres and "
            "three gallery spaces. Flexible and affordable, suited to performances, "
            "film screenings, and creative industry events."
        ),
        "amenities": ["wifi", "catering", "av", "stage"],
    },
    {
        "name": "Cardiff City Hall",
        "city": "Cardiff",
        "capacity": 350,
        "price_per_day": "2600.00",
        "description": (
            "Cardiff City Hall's marble halls and ornate council chambers have hosted "
            "events since 1906. A prestigious civic landmark for banquets, conferences, "
            "and civic ceremonies, all within the Civic Centre."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "accessibility"],
    },
    {
        "name": "Depot Cardiff",
        "city": "Cardiff",
        "capacity": 200,
        "price_per_day": "1500.00",
        "description": (
            "Situated in Cardiff's creative district, Depot is a converted railway "
            "goods shed offering a raw industrial aesthetic and modular furniture. "
            "Regularly used for pop-up markets, brand launches, and networking events."
        ),
        "amenities": ["wifi", "catering", "av"],
    },
    {
        "name": "Leeds First Direct Arena",
        "city": "Leeds",
        "capacity": 500,
        "price_per_day": "4900.00",
        "description": (
            "Yorkshire's largest indoor arena, capable of hosting 13,500 for concerts "
            "but equally suited to large conferences and exhibitions using its "
            "partition system. Full technical production in-house."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage", "loading_bay"],
    },
    {
        "name": "Cloth Hall Court",
        "city": "Leeds",
        "capacity": 220,
        "price_per_day": "2200.00",
        "description": (
            "A beautifully renovated Victorian commercial building in central Leeds, "
            "with ornate ironwork and a soaring glass atrium. A sophisticated choice "
            "for black-tie dinners, company celebrations, and legal conferences."
        ),
        "amenities": ["wifi", "catering", "bar", "accessibility"],
    },
    {
        "name": "The Tetley",
        "city": "Leeds",
        "capacity": 130,
        "price_per_day": "1200.00",
        "description": (
            "Set inside the former Tetley Brewery headquarters, this arts-led venue "
            "offers gallery spaces and a contemporary bar for private events, press "
            "previews, and intimate conferences."
        ),
        "amenities": ["wifi", "catering", "bar", "av"],
    },
    {
        "name": "Dock10 Studios",
        "city": "Manchester",
        "capacity": 10,
        "price_per_day": "3000.00",
        "description": (
            "Professional broadcast-quality TV studios at MediaCityUK. Five stages "
            "with infinity cycs, full lighting rigs, and production galleries. "
            "Ideal for live streaming, video production, and immersive brand films."
        ),
        "amenities": ["wifi", "av", "stage", "green_room"],
    },
    {
        "name": "Glasshouse Newcastle",
        "city": "Newcastle",
        "capacity": 400,
        "price_per_day": "3100.00",
        "description": (
            "Perched above the River Tyne, the Glasshouse International Centre for "
            "Music features a 1,700-seat hall and flexible foyers. Acoustic excellence "
            "meets modern event infrastructure for concerts and corporate dinners."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage"],
    },
    {
        "name": "The Lighthouse Glasgow",
        "city": "Glasgow",
        "capacity": 230,
        "price_per_day": "2400.00",
        "description": (
            "Scotland's Centre for Design and Architecture, set in Charles Rennie "
            "Mackintosh's former Herald building. Rooftop views, gallery rooms, and "
            "a stylish blank-canvas event space for creative conferences and launches."
        ),
        "amenities": ["wifi", "catering", "av", "outdoor_space"],
    },
    {
        "name": "SEC Armadillo Glasgow",
        "city": "Glasgow",
        "capacity": 500,
        "price_per_day": "4300.00",
        "description": (
            "The iconic Armadillo on Glasgow's waterfront seats up to 3,000 in "
            "theatre mode or 500 in a flat-floor banquet configuration. "
            "A landmark choice for major award ceremonies and large conferences."
        ),
        "amenities": ["wifi", "parking", "catering", "av", "stage", "accessibility"],
    },
]


class Command(BaseCommand):
    help = "Seed the database with 25 realistic UK venues and compute embeddings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-embeddings",
            action="store_true",
            help="Skip OpenAI embedding generation (faster, but AI search won't work).",
        )
        parser.add_argument(
            "--no-images",
            action="store_true",
            help="Skip DALL-E image generation.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing Venue records before seeding.",
        )

    def handle(self, *args, **options):
        from apps.venues.models import Venue

        if options["clear"]:
            count, _ = Venue.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} existing venue(s)."))

        skip_embeddings = options["no_embeddings"]
        skip_images = options["no_images"]

        if not settings.OPENAI_API_KEY:
            self.stdout.write(self.style.WARNING("OPENAI_API_KEY is not set – skipping embeddings and images."))
            skip_embeddings = True
            skip_images = True

        if not skip_embeddings or not skip_images:
            from openai import OpenAI

            client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=60)

        if not skip_images:
            media_dir = Path(settings.MEDIA_ROOT) / "venues"
            media_dir.mkdir(parents=True, exist_ok=True)

        created_count = 0
        skipped_count = 0

        for data in VENUES_DATA:
            venue, created = Venue.objects.get_or_create(
                name=data["name"],
                city=data["city"],
                defaults={
                    "capacity": data["capacity"],
                    "price_per_day": data["price_per_day"],
                    "description": data["description"],
                    "amenities": data["amenities"],
                },
            )

            if not created:
                skipped_count += 1
                self.stdout.write(f"  skip  {venue.name} ({venue.city}) – already exists")
                continue

            created_count += 1

            if not skip_embeddings:
                text = (
                    f"{venue.name}. Located in {venue.city}. "
                    f"Capacity: {venue.capacity} people. "
                    f"Price: £{venue.price_per_day} per day. "
                    f"Amenities: {', '.join(venue.amenities)}. "
                    f"{venue.description}"
                )
                try:
                    response = client.embeddings.create(
                        model="text-embedding-3-small",
                        input=text,
                    )
                    venue.embedding = response.data[0].embedding
                    venue.save(update_fields=["embedding"])
                    self.stdout.write(f"  ✓ {venue.name} ({venue.city}) – embedded")
                    time.sleep(0.3)
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"  ✗ {venue.name}: embedding failed – {exc}"))
            else:
                self.stdout.write(f"  ✓ {venue.name} ({venue.city}) – no embedding")

            if not skip_images and not venue.image_url:
                prompt = (
                    f"Professional architectural event venue photograph of {venue.name}, "
                    f"a {venue.description[:120]} in {venue.city}, UK. "
                    f"High quality, realistic, daytime exterior or interior shot."
                )
                try:
                    img_response = client.images.generate(
                        model="dall-e-3",
                        prompt=prompt,
                        size="1024x1024",
                        quality="standard",
                        n=1,
                    )
                    temp_url = img_response.data[0].url
                    dest = media_dir / f"{venue.pk}.jpg"
                    urllib.request.urlretrieve(temp_url, dest)
                    venue.image_url = f"/media/venues/{venue.pk}.jpg"
                    venue.save(update_fields=["image_url"])
                    self.stdout.write(f"  ✓ {venue.name} ({venue.city}) – image saved")
                    time.sleep(0.5)
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"  ✗ {venue.name}: image failed – {exc}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created: {created_count}  |  Skipped (duplicate): {skipped_count}"
            )
        )
        if skip_embeddings:
            self.stdout.write(
                self.style.WARNING(
                    "Embeddings were NOT generated. "
                    "Run with OPENAI_API_KEY set and without --no-embeddings to enable AI search."
                )
            )
