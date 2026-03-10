import { Component, AfterViewInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem } from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';
import * as L from 'leaflet';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, NgIf],
})
export class HomePage implements AfterViewInit {

  map: any;
  marker: any;
  routeLine: any;
  watchId: any;

  routePoints: any[] = [];

  distance: any = 0;
  duration: string = "";

  startTime: any;
  endTime: any;

  ngAfterViewInit() {
    this.initMap();
  }

  initMap() {

    this.map = L.map('map').setView([13.0827, 80.2707], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.routeLine = L.polyline([], {
      color: 'blue',
      weight: 5
    }).addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);

  }

  startTracking() {

    this.routePoints = [];
    this.startTime = new Date();

    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition((p) => {

      const lat = p.coords.latitude;
      const lng = p.coords.longitude;

      const point = L.latLng(lat, lng);

      if (!this.marker) {
        this.marker = L.marker(point).addTo(this.map);
      } else {
        this.marker.setLatLng(point);
      }

      this.map.panTo(point);

      this.routeLine.addLatLng(point);

      this.routePoints.push({
        lat,
        lng,
        time: new Date().toISOString()
      });

    },
    (err) => {
      console.log(err);
    },
    {
      enableHighAccuracy: true
    });

  }

  stopTracking() {

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.endTime = new Date();

    const seconds = (this.endTime.getTime() - this.startTime.getTime()) / 1000;

    const minutes = Math.floor(seconds / 60);

    this.duration = minutes + " minutes";

  }

  exportGPX() {

    if (this.routePoints.length === 0) {
      alert("No route recorded");
      return;
    }

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="IonicTracker">
<trk>
<trkseg>
`;

    this.routePoints.forEach(p => {

      gpx += `<trkpt lat="${p.lat}" lon="${p.lng}">
<time>${p.time}</time>
</trkpt>
`;

    });

    gpx += `
</trkseg>
</trk>
</gpx>`;

    const blob = new Blob([gpx], { type: "application/gpx+xml" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "route.gpx";
    link.click();

  }

  loadGPX(event: any) {

    const file = event.target.files[0];

    const reader = new FileReader();

    reader.onload = (e: any) => {

      const parser = new DOMParser();

      const xml = parser.parseFromString(e.target.result, "text/xml");

      const points = xml.getElementsByTagName("trkpt");

      const latlngs: any[] = [];

      let totalDistance = 0;

      for (let i = 0; i < points.length; i++) {

        const latAttr = points[i].getAttribute("lat");
        const lonAttr = points[i].getAttribute("lon");

        if (latAttr && lonAttr) {

          const lat = parseFloat(latAttr);
          const lng = parseFloat(lonAttr);

          const current = L.latLng(lat, lng);

          latlngs.push(current);

          if (latlngs.length > 1) {

            const prev = latlngs[latlngs.length - 2];

            totalDistance += current.distanceTo(prev);

          }

        }

      }

      this.distance = (totalDistance / 1000).toFixed(2);

      const polyline = L.polyline(latlngs, {
        color: "red",
        weight: 5
      }).addTo(this.map);

      this.map.fitBounds(polyline.getBounds());

      const startMarker = L.marker(latlngs[0]).addTo(this.map);
      startMarker.bindPopup("Start");

      const endMarker = L.marker(latlngs[latlngs.length - 1]).addTo(this.map);
      endMarker.bindPopup("End");

    };

    reader.readAsText(file);

  }

}