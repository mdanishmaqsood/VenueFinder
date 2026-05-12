from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("venues", "0002_venue_embedding_index"),
    ]

    operations = [
        migrations.AddField(
            model_name="venue",
            name="image_url",
            field=models.URLField(blank=True, default=""),
        ),
    ]
