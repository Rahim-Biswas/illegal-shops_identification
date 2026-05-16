"""
Deploy the Illegal Shop Detection survey form on KoboToolbox.
Updates form 'axbZkHAm9MP4DMNSpeGBxu' with the correct XLSForm content,
then deploys it.
"""
import urllib.request
import json

TOKEN = 'dcc5b43ab772ce3e9347ee29f329538941011430'
NEW_UID = 'axbZkHAm9MP4DMNSpeGBxu'
BASE = 'https://kf.kobotoolbox.org/api/v2'
HEADERS = {'Authorization': f'Token {TOKEN}', 'Accept': 'application/json'}

# ── XLSForm survey content for Illegal Shop Detection ──────────────────────
FORM_CONTENT = {
    "survey": [
        {"type": "start", "name": "start"},
        {"type": "end",   "name": "end"},

        # ── Group: Inspector Info ──
        {"type": "begin_group", "name": "inspector_info", "label": ["Inspector Information"]},
        {
            "type": "text",
            "name": "Inspector_Name",
            "label": ["Inspector Full Name"],
            "required": True,
        },
        {
            "type": "text",
            "name": "Inspector_ID",
            "label": ["Inspector ID / Badge Number"],
            "required": True,
        },
        {
            "type": "select_one",
            "name": "Municipality_Zone",
            "label": ["Municipality Zone"],
            "required": True,
        },
        {"type": "end_group"},

        # ── Group: Shop Details ──
        {"type": "begin_group", "name": "shop_details", "label": ["Shop Details"]},
        {
            "type": "text",
            "name": "Shop_Name",
            "label": ["Shop / Business Name"],
            "required": True,
        },
        {
            "type": "text",
            "name": "Shop_Owner_Name",
            "label": ["Shop Owner Name"],
        },
        {
            "type": "text",
            "name": "Contact_Number",
            "label": ["Owner Contact Number"],
        },
        {
            "type": "text",
            "name": "License_Number",
            "label": ["Business License Number (if any)"],
        },
        {"type": "end_group"},

        # ── Group: Violation Details ──
        {"type": "begin_group", "name": "violation_details", "label": ["Violation Details"]},
        {
            "type": "select_one",
            "name": "Violation_Type",
            "label": ["Violation Type"],
            "required": True,
        },
        {
            "type": "text",
            "name": "Violation_Description",
            "label": ["Describe the Violation in Detail"],
            "required": True,
        },
        {
            "type": "select_one",
            "name": "Action_Taken",
            "label": ["Action Taken"],
            "required": True,
        },
        {"type": "end_group"},

        # ── Group: Location & Time ──
        {"type": "begin_group", "name": "location_time", "label": ["Location & Time"]},
        {
            "type": "geopoint",
            "name": "GPS_Location",
            "label": ["GPS Location (tap to capture)"],
            "required": True,
        },
        {
            "type": "date",
            "name": "Inspection_Date",
            "label": ["Inspection Date"],
            "required": True,
        },
        {
            "type": "time",
            "name": "Inspection_Time",
            "label": ["Inspection Time"],
        },
        {"type": "end_group"},

        # ── Evidence ──
        {
            "type": "image",
            "name": "Evidence_Photo",
            "label": ["Capture Evidence Photo"],
        },
        {
            "type": "note",
            "name": "submission_note",
            "label": ["Thank you. Your inspection report has been recorded."],
        },
    ],
    "choices": [
        # Municipality_Zone choices
        {"list_name": "Municipality_Zone", "name": "old_city",      "label": ["Old City"]},
        {"list_name": "Municipality_Zone", "name": "al_haram",      "label": ["Al Haram"]},
        {"list_name": "Municipality_Zone", "name": "quba",          "label": ["Quba"]},
        {"list_name": "Municipality_Zone", "name": "jabal_uhud",    "label": ["Jabal Uhud"]},
        {"list_name": "Municipality_Zone", "name": "aziziyah",      "label": ["Aziziyah"]},
        {"list_name": "Municipality_Zone", "name": "other",         "label": ["Other"]},

        # Violation_Type choices
        {"list_name": "Violation_Type", "name": "no_license",            "label": ["No License"]},
        {"list_name": "Violation_Type", "name": "expired_license",       "label": ["Expired License"]},
        {"list_name": "Violation_Type", "name": "illegal_construction",  "label": ["Illegal Construction"]},
        {"list_name": "Violation_Type", "name": "health_violation",      "label": ["Health & Safety Violation"]},
        {"list_name": "Violation_Type", "name": "zoning_violation",      "label": ["Zoning Violation"]},
        {"list_name": "Violation_Type", "name": "fire_safety",           "label": ["Fire Safety Violation"]},
        {"list_name": "Violation_Type", "name": "encroachment",          "label": ["Encroachment on Public Land"]},
        {"list_name": "Violation_Type", "name": "noise_pollution",       "label": ["Noise / Pollution Violation"]},
        {"list_name": "Violation_Type", "name": "other",                 "label": ["Other"]},

        # Action_Taken choices
        {"list_name": "Action_Taken", "name": "warning_issued",     "label": ["Warning Issued"]},
        {"list_name": "Action_Taken", "name": "fine_imposed",       "label": ["Fine Imposed"]},
        {"list_name": "Action_Taken", "name": "shop_sealed",        "label": ["Shop Sealed"]},
        {"list_name": "Action_Taken", "name": "notice_served",      "label": ["Legal Notice Served"]},
        {"list_name": "Action_Taken", "name": "referred",           "label": ["Referred to Higher Authority"]},
        {"list_name": "Action_Taken", "name": "monitoring",         "label": ["Under Monitoring"]},
        {"list_name": "Action_Taken", "name": "no_action",          "label": ["No Immediate Action"]},
    ],
    "settings": {
        "form_title": "Illegal Shop Detection & Reporting",
        "form_id":    "illegal_shop_detection",
        "version":    "2026050001",
        "style":      "pages",
    },
}


def kobo_request(method, path, data=None):
    url = f'{BASE}/{path}'
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(
        url,
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json'},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)


print("=" * 60)
print(f"Updating form {NEW_UID} with Illegal Shop Detection content...")

status, resp = kobo_request('PATCH', f'assets/{NEW_UID}/', {
    'name': 'Illegal Shop Detection & Reporting',
    'content': FORM_CONTENT,
})
print(f"PATCH status: {status}")
if status == 200:
    print("Form content updated successfully!")
    print("Name:", resp.get('name'))
    print("Fields:", len(resp.get('content', {}).get('survey', [])))
else:
    print("Error:", str(resp)[:600])
    exit(1)

# ── Deploy the form ──────────────────────────────────────────────────────────
print("\nDeploying form...")
status2, resp2 = kobo_request('POST', f'assets/{NEW_UID}/deployment/', {
    'active': True,
})
print(f"Deploy status: {status2}")
if status2 in (200, 201):
    print("Form DEPLOYED successfully!")
    print("Active:", resp2.get('active'))
    print("UID:", NEW_UID)
    print("\n>>> Update your .env: KOBO_ASSET_UID=" + NEW_UID)
elif status2 == 400:
    # Already deployed — just mark active
    print("Already deployed. Updating deployment to active...")
    status3, resp3 = kobo_request('PATCH', f'assets/{NEW_UID}/deployment/', {'active': True})
    print(f"PATCH deploy status: {status3}")
    if status3 == 200:
        print("Deployment activated!")
        print("\n>>> Update your .env: KOBO_ASSET_UID=" + NEW_UID)
    else:
        print("Error:", str(resp3)[:400])
else:
    print("Deploy error:", str(resp2)[:400])
