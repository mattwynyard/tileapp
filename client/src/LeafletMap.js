import './LeafletMap.css';
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap, useMapEvents, ScaleControl} from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card }  from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Collapse, Button, Row, Col} from 'antd';
import React, { useState, useEffect, useRef, useCallback } from 'react';

function MapEvents(props) {
    const map = useMapEvents({
      click: (e) => {
        props.mouse(e.latlng);
      }     
    })
    return null
  }

function Thumbnail(props) {
    useEffect(() => {

    });
    if (props.photo !== null) {
        return (<img className="image"
        src={`data:image/jpeg;base64,${props.photo}`}/>
        );
    } else {
        return null;
    }
    
}

  function FootpathPolyLine(props) {
    const redOptions = { color: 'red' }
    let otherOptions = null;

    switch(props.positions.side) {
        case "L":
                otherOptions = { color: 'blue' }
          break;
        case "R":
                otherOptions = { color: 'orange' }
          break;
        default:
            otherOptions = { color: 'black' }
        break;
    }
    let geojson = JSON.parse(props.positions.geojson);
    let coords = []
    geojson.coordinates.forEach(element => {
        let temp = element[0];
        element[0] = element[1];
        element[1] = temp;
        coords.push(element)
    });
    return ( <Polyline
        key={`marker-${props.idx}`} 
        pathOptions={(props.idx == 0) ? redOptions: otherOptions}
        positions={coords}     
        >
      </Polyline>);
  }


function LeafletMap(props) {

    const gnssObj = {
        latitude: "---",
        longitude: "---",
        altitude: "---",
        satellites: "---",
        hdop: "---",
        course: "---",
        speed: "---"
    }

    const EARTH_RADIUS = 6371000 //metres
    const [latlng, setPosition] = useState([]);
    const [footpaths, setFootpaths] = useState([]);
    const [mode, setMode] = useState("AUTO");
    const [project, setProject] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [gpsData, setGpsData] = useState([gnssObj]);
    const [host] = useState("localhost:5000");
    const [online, setOnline] = useState(false);
    const [camera, setCamera] = useState("Offline");
    const positionRef = useRef();
       /**
     * Calculates distance on earth surface
     */
    const calcGCDistance = (distance) => {
        return distance * EARTH_RADIUS * (Math.PI /180);
    }

    const pollServer = () => {

        const interval = setInterval(() => {
            getPosition().then(data => { 
                if (typeof(data) != "undefined") {
                    setPhoto(data.photo)
                    if (data.position !== {}) {
                        let lat = data.position.latitude;
                        let lng = data.position.longitude;
                        setPosition([L.latLng(lat, lng)]);
                        setGpsData([data.position]);       
                    }    
                }               
            })    
        }, 1000);
    }

    const mousePosition = async (latlng) => {
        try {
            const response = await fetch("http://" + host + '/mouse', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',        
                },
                body: JSON.stringify({
                    project: project,
                    lat: latlng.lat,
                    lng: latlng.lng,
                })
            });
            if (response.ok) {
                const body = await response.json();
                let fp = []
                ///console.log(calcGCDistance(body.message[0].dist));
                for (let i = 0; i < body.message.length; i++) {
                    fp.push(body.message[i])
                }
                setFootpaths(fp);
                return body; 
            } else {
                
                return Error(response);
            }
        } catch {
            setOnline(false);
            //props.online(false);
            return new Error("connection error")
        }    
    };
    
    const callBackendAPI = async () => {
        try {
            let response = await fetch("http://" + host + '/api');
            if (response.ok) {
                setOnline(true);
                pollServer();
                const body = await response.json();
                console.log(body)
                return body; 
            } else {
                console.log(response);
                setOnline(false);
                return Error(response);
            }
        } catch {
            setOnline(false);
            return new Error("connection error")
        } 
  
    };
      
    const getPosition = async () => {
    try {
        const response = await fetch("http://" + host + '/position')
    
        if (response.status !== 200) {
            throw Error(response) 
        } else {
            try {
                setOnline(true);
                
                const body = await response.json();
                if (!body.open) {
                    setOnline(false);
                } else {
                    return body;
                    
                }          
            } catch {
                console.log("position error")
            }      
            }
            //return body; 
    } catch {
        setOnline(false);
        console.log("server error"); 
    }  
    };

      const clickAuto = (e) => {
        console.log('marker clicked')
        console.log(e.target.innerHTML);
        if (e.target.innerHTML === "AUTO") {
            setMode("MANUAL")
        } else {
            setMode("AUTO")
        }
      };

      const clickOnline = (e) => {
        callBackendAPI(); 
      };
      

    //component did mount
    // useEffect(() => {
    //     console.log("component mounted")
    //     if(online) {
    //     const interval = setInterval(() => {
    //         getPosition().then(data => { 
    //             if (typeof(data) != "undefined") {
    //                 setPhoto(data.photo)
    //                 if (data.position !== {}) {
    //                     let lat = data.position.latitude;
    //                     let lng = data.position.longitude;
    //                     setPosition([L.latLng(lat, lng)]);
    //                     setGpsData([data.position]);       
    //                 }    
    //             }               
    //         })    
    //     }, 1000);
    //     return () => clearInterval(interval);
    // }}, [getPosition]);

  return (
      
    <React.Fragment>
        <MapContainer 
            className="map" 
            center={[-36.81835, 174.74581]} 
            zoom={12} 
            minZoom={10}
            maxZoom={18}
            scrollWheelZoom={true}
            keyboard={true}
        >
        <MapEvents mouse={mousePosition}/>
        <div className="camera">
            <Card className="camera-card">
                <Card.Body border="secondary">    
                <Card.Title>Camera
                <Button 
                    className="camera=btn"
                    variant="primary" 
                    size="sm"
                    onClick={clickOnline} 
                    >{camera}</Button>
                </Card.Title>
                    <Thumbnail photo={photo}/>
                    
                </Card.Body>
            </Card>
        </div>  
        <Row className="tool-menu">
            <Col className="mode-col" 
            span={50}
            >
                <Button 
                    className="mode=btn"
                    type="default"
                    onClick={clickAuto}
                >{mode}
                </Button>
            </Col>
            <Col className="gps-menu" span={150}>
                <Collapse >
                    <svg 
                        className="gnss-online" 
                        viewBox="1 1 10 10" x="16" 
                        width="16" 
                        stroke={online ? "lime": "red"} 
                        fill={online ? "lime": "red"} 
                        >
                        <circle cx="5" cy="5" r="3" />
                    </svg>       
                    <Collapse.Panel 
                        className="gps-panel" 
                        header="GNSS" 
                        key="1">
                    {gpsData.map((position, idx) =>
                        <div className="gps-panel" key={`marker-${idx}`} >
                            <b>Lat: {position.latitude}</b><br></br>
                            <b>Lng: {position.longitude}</b><br></br>
                            <b>Alt: {position.altitude}m</b><br></br>
                            <b>Sat: {position.satellites}</b><br></br>
                            <b>HDop: {position.hdop}m</b><br></br>
                            <b>Course: {position.course}</b><br></br>
                            <b>Speed: {position.speed}km/hr</b>
                        </div>
                    )}
                    </Collapse.Panel>
                </Collapse>
            </Col>
        </Row>
        
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          //url="/tiles/auckland/{z}/{x}/{y}.png"
        />
         <ScaleControl name="Scale" className="scale"/>
        {latlng.map((position, idx) =>
            <CircleMarker 
              ref={positionRef}
              key={`marker-${idx}`} 
              center={position}
              radius ={5}
              fill={true}
              fillOpacity={1.0}
              color={online ? "blue": "red"}
              eventHandlers={{
                click: () => {
                  console.log('marker clicked')
                },
              }}
              >
              
            </CircleMarker>
          )}
          {footpaths.map((positions, idx) =>
          <FootpathPolyLine
            key={`marker-${idx}`} 
            positions={positions}
            idx={idx}
          />
          )}
      </MapContainer>
    </React.Fragment>
  );
}

export default LeafletMap;
