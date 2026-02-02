from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

import requests
from timezonefinderL import TimezoneFinder
from skyfield.api import load, Topos, EarthSatellite, utc
from skyfield.framelib import ecliptic_frame 
from datetime import datetime
import pytz
from pytz import timezone

class NatalChartRequest(BaseModel):
    city: str
    date: str
    time: str

app = FastAPI(title="Astrology FastAPI")

# Configuração CORS para desenvolvimento local e deploy na vercel
origins = [
    "http://localhost:3000",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    print("Carregando efemérides. Isso pode demorar na primeira vez...")
    ts = load.timescale()
    planets = load('de421.bsp')
    print("Efemérides carregados com sucesso!")

except Exception as e:
    print(f"500: Falha ao carregar efemérides. {e}")
    raise

earth = planets['earth']

PLANET_MAPPING = {
    'Sol': 'SUN',
    'Lua': 'MOON',
    'Mercúrio': 'MERCURY BARYCENTER',
    'Vênus': 'VENUS BARYCENTER',
    'Marte': 'MARS BARYCENTER',
    'Júpiter': 'JUPITER BARYCENTER',   
    'Saturno': 'SATURN BARYCENTER',    
    'Urano': 'URANUS BARYCENTER',      
    'Netuno': 'NEPTUNE BARYCENTER',    
    'Plutão': 'PLUTO BARYCENTER',
}


def geocode_city(city: str) -> tuple[float, float, str]:

    # Geocodificação simplificada, sem usar uma API externa.
    if city.lower() == "sao paulo":
        lat, lon = -23.5505, -46.6333
    elif city.lower() == "london":
        lat, lon = 51.5074, 0.1278
    else:
        # Colocar aqui uma API externa no futuro, São Paulo default fallback
        lat, lon = -23.5505, -46.6333

    tf = TimezoneFinder()
    tz_name = tf.timezone_at(lng=lon, lat=lat)
    
    if not tz_name:
        tz_name = 'UTC'  # UTC default fallback
    return lat, lon, tz_name


def calculate_astrology(lat: float, lon: float, tz_name: str, dt_iso: str) -> Dict[str, Any]:
    
    dt_local = datetime.fromisoformat(dt_iso)
    
    local_tz = timezone(tz_name)
    dt_utc = local_tz.localize(dt_local).astimezone(pytz.utc)
    
    time = ts.utc(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour, dt_utc.minute, dt_utc.second)

    location = Topos(latitude_degrees=lat, longitude_degrees=lon)

    sidereal_time = time.gmst
    
    positions: Dict[str, float] = {}
    
    for pt_name, en_name in PLANET_MAPPING.items():
        
        try:
            body = planets[en_name] 
        except KeyError:
            print(f"Aviso: Corpo celeste '{en_name}' não encontrado no efemérides.")
            continue

        pos = (earth + location).at(time).observe(body).apparent()
        
        ecliptic_coords = pos.frame_latlon(ecliptic_frame)
        
        positions[pt_name] = round(ecliptic_coords[1].degrees, 2)
    
    # Retorno dos resultados (placeholders para Ascendente/MC)
    return {
        "latitude": lat,
        "longitude": lon,
        "timezone": tz_name,
        "siderealTime": round(sidereal_time, 4),
        "planetas": positions,
        # Ascendente e Meio do Céu (apenas placeholders), necessário incluir cálculo de cúspides de casas no futuro.
        "ascendente": 0.0, 
        "meioDoCeu": 0.0, 
    }

@app.post("/chart")
async def get_natal_chart(request: NatalChartRequest):
    
    try:
        lat, lon, tz_name = geocode_city(request.city)
        
        dt_iso = f"{request.date}T{request.time}"
        
        chart_data = calculate_astrology(lat, lon, tz_name, dt_iso)
        
        return {
        "cidade": request.city,
        "ascendente": chart_data.get("ascendente"),
        "meioDoCeu": chart_data.get("meioDoCeu"),
        "planetas": chart_data.get("planetas"),
        
        "detalhes": {
            "latitude": lat,
            "longitude": lon,
            "timezone": tz_name,
            "dataHoraUTC": chart_data.get("dataHoraUTC"),
            "siderealTime": chart_data.get("siderealTime"),
        }
    }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Erro interno no servidor: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno no servidor: {e}")