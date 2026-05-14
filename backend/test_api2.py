import httpx

client = httpx.Client(base_url='http://127.0.0.1:8000')

try:
    # Login as admin
    login_data = {'email': 'admin@geoai.com', 'password': 'GeoAdmin@2024'}
    res = client.post('/api/auth/login', json=login_data)
    print('Login:', res.status_code)
    print('Login body:', res.text[:200])

    if res.status_code == 200:
        token = res.json().get('access_token')
        headers = {'Authorization': f'Bearer {token}'}

        # Get map data
        res2 = client.get('/api/complaints/admin/map-data', headers=headers)
        print('Map Data status:', res2.status_code)
        print('Map Data body:', res2.text[:500])
except Exception as e:
    print('Error:', e)
