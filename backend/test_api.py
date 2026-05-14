import httpx

client = httpx.Client(base_url='http://127.0.0.1:8000/api')

try:
    # Login as admin
    login_data = {'username': 'admin@geoai.com', 'password': 'GeoAdmin@2024'}
    res = client.post('/auth/login', json=login_data)
    print('Login:', res.status_code, res.text[:100])

    token = res.json().get('access_token')

    # Get map data
    headers = {'Authorization': f'Bearer {token}'}
    res2 = client.get('/complaints/admin/map-data', headers=headers)
    print('Map Data:', res2.status_code, res2.text[:100])
except Exception as e:
    print('Error:', e)
