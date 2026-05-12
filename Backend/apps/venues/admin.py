from django.contrib import admin

from .models import Shortlist, ShortlistSummarySent, Venue


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "capacity", "price_per_day", "created_at")
    list_filter = ("city",)
    search_fields = ("name", "city", "description")
    ordering = ("city", "name")
    readonly_fields = ("created_at", "embedding")
    fieldsets = (
        (None, {"fields": ("name", "city", "capacity", "price_per_day")}),
        ("Details", {"fields": ("description", "amenities")}),
        ("Metadata", {"fields": ("created_at", "embedding"), "classes": ("collapse",)}),
    )


@admin.register(Shortlist)
class ShortlistAdmin(admin.ModelAdmin):
    list_display = ("user", "venue", "created_at")
    list_filter = ("user",)
    search_fields = ("user__username", "venue__name")
    readonly_fields = ("created_at",)


@admin.register(ShortlistSummarySent)
class ShortlistSummarySentAdmin(admin.ModelAdmin):
    list_display = ("user", "sent_at")
    readonly_fields = ("sent_at",)
