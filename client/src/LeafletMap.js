import './LeafletMap.css';
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap, useMapEvents, ScaleControl} from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, Button as BButton}  from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Collapse, Button, Row, Col, Menu, Dropdown, Space, Modal} from 'antd';
import { DownOutlined} from '@ant-design/icons';
import 'antd/dist/antd.css';
import React, { useState, useEffect, useRef} from 'react';

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function MapEvents(props) {
    const map = useMapEvents({
      click: (e) => {
        props.mouse(e.latlng);
      }     
    });
    return null;
  }

function Thumbnail(props) {
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
    let geojson = JSON.parse(props.positions.geojson);
    let coords = []
    geojson.coordinates.forEach(element => {
        let temp = element[0];
        element[0] = element[1];
        element[1] = temp;
        coords.push(element)
    });
    switch(props.positions.grade) {
        case 0:
                otherOptions = { color: 'hotpink' }
          break;
        default:
            otherOptions = { color: 'lime' }
        break;
    }
    return ( <Polyline
        key={`marker-${props.idx}`} 
        pathOptions={(props.idx === 0) ? redOptions: otherOptions}
        positions={coords} 
        weight={5}
        eventHandlers={ (props.idx === 0) ? {
            click: () => {
              props.parentShowModal(true, props.positions.id, props.positions.grade, props.positions.label, props.positions.side);
            },
          } : null}
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

    const cameraObj = {
        battery: "---",
        error: "---",
        frequency: "---",
        filename: "---",
        savetime: "---",
    }

    const gradeButtons = [1, 2, 3, 4 ,5]

    const EARTH_RADIUS = 6371000 //metres
    const [latlng, setPosition] = useState([]);
    const [footpaths, setFootpaths] = useState([]);
    const [mode, setMode] = useState("AUTO");
    const [project, setProject] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [gpsData, setGpsData] = useState([gnssObj]);
    const [cameraData, setCameraData] = useState([cameraObj]);
    const [host] = useState("localhost:5000");
    const [gnssOnline, setgnssOnline] = useState(false);
    const [camera, setCamera] = useState("Connect");
    const [connectDisabled, setConnectDisabled] = useState(true);
    const [recording, setRecording] = useState(false);
    const [cameraName, setCameraName] = useState("---");
    const [baud, setBaud] = useState("---");
    const [comPort, setComPort] = useState("---");
    const [label, setLabel] = useState(null);
    const [grade, setGrade] = useState(null);
    const [side, setSide] = useState(null);
    const [id, setId] = useState(null);
    const positionRef = useRef();
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = (isVisible, id, grade, label, side) => {
        setId(id);
        setLabel(label);
        setGrade(grade);
        setSide(side);
        setIsModalVisible(isVisible);
      };
    
      const handleOk = () => {
        setIsModalVisible(false);
      };
    
      const handleCancel = () => {
        setIsModalVisible(false);
      };

    useEffect(() => {
        console.log("mount camera")
        let camera = localStorage.getItem("camera");
        if (camera === null) {
            setCameraName("---");
        } else {
            setCameraName(camera);
        }
    },[cameraName]);
       /**
     * Calculates distance on earth surface
     */
    const calcGCDistance = (distance) => {
        return distance * EARTH_RADIUS * (Math.PI /180);
    }
    let online = false;
    let interval = null;
    const setOnline = (isOnline) => {
        setgnssOnline(isOnline);
        online = isOnline;
    }

    const pollServer = (rate) => {    
        interval = setInterval(() => {
            if(online) {
            getPosition().then(data => {
                if (typeof(data) !== "undefined") {
                    setPhoto(data.photo)
                    if (data.position !== null) {
                        let lat = data.position.latitude;
                        let lng = data.position.longitude;
                        setPosition([L.latLng(lat, lng)]);
                        setGpsData([data.position]);
                        let f = null;
                        let s = null;
                        let fq = null;

                        if (data.message.filename == null) {
                            f = "---"
                        } else {
                            let filename = data.message.filename.split("_");
                            f = filename[filename.length - 1]
                        }
                        if (data.message.frequency == null) {
                            fq = "---"
                        } else {
                            fq = data.message.frequency
                        }
                        if (data.message.savetime == null) {
                            s = "---"
                        } else {
                            s = data.message.savetime
                        }
                        let cameraObj = {
                            battery: data.message.battery,
                            error: data.message.error,
                            frequency: fq,
                            filename: f,
                            savetime: s,
                        }
                        setCameraData([cameraObj]);   
                    }    
                }               
            })
        }          
        }, rate);     
    }

    const mousePosition = async (latlng) => {
        
        if (mode === "MANUAL") {
            try {
                const response = await fetch("http://" + host + '/footpath', {
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
                    //console.log(calcGCDistance(body.message[0].dist));
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
                return new Error("connection error")
            }    
        }
        
    };

    const updateGrade = async (id, grade) => {
        
        try {
            const response = await fetch("http://" + host + '/grade', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',        
                },
                body: JSON.stringify({
                    project: project,
                    id: id,
                    grade: grade,
                })
            });
            if (response.ok) {
                const body = await response.json();
                
                return body; 
            } else {
                
                return Error(response);
            }
        } catch {
            setOnline(false);
            return new Error("connection error")
        }      
    };
    
    const callBackendAPI = async () => {
        try {
            const response = await fetch("http://" + host + '/java', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',        
                },
                body: JSON.stringify({
                    camera: cameraName,
                })
            });
            if (response.ok) {
                const body = await response.json();

                if (body.java === "Connecting") {
                    setCamera(body.java);
                }
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
                if (!response.ok) {
                    throw Error(response) 
                } else {
                    try {
                        const body = await response.json();
                        if(body.message.connected) {
                            setCamera("Connected");
                        } 
                        if (body.message !== null) {
                            setRecording(body.message.recording);
                        }
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
                setRecording(false);
                setCamera("Error");
                console.log("server error"); 
            }  
    };

      const clickAuto = (e) => {
        if (e.target.innerHTML === "AUTO") {
            setMode("MANUAL");
        } else {
            setMode("AUTO");
        }
      };

    const clickOnline = (e) => {
        e.preventDefault();
        let res = callBackendAPI(); 
    };

    const clickCamera = (e) => {
        localStorage.setItem("camera", e.key);
        setCameraName(e.key);
    }

    const clickBaud = (e) => {
        setBaud(e.key);
    }

    const clickCom = (e) => {
        setComPort(e.key);
    }

    const clickGrade = (e) => {
        setGrade(e.target.innerText);
        updateGrade(id, e.target.innerText);        
    }

    /**
     * Handler for clicking record button. Starts and stops android camera
     * @param {click event} e 
     * @returns response
     */
    const clickRecord = async(e) => {
        if (camera === "Connected") {
            try {
                let response = await fetch("http://" + host + '/record', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',        
                    },
                    body: JSON.stringify({
                        command: recording
                    })
                });
                if (response.ok) {
                    const body = await response.json();
                    console.log(body)
                    return body; 
                } else {
                    console.log(response);
                    return Error(response);
                }
            } catch {
                return new Error("record error")
            } 
        }
    
    };

    /**
     * Handler for clicking gnss button. Checks if gnss online on server
     * @param {click event} e 
     * @returns response
     */
     const clickGnss = async(e) => {
        if(!gnssOnline) {
            try {
                let response = await fetch("http://" + host + '/gnss', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',        
                    },
                    body: JSON.stringify({
                        com: comPort,
                        baud: baud
                    })
                });
                if (response.ok) {
                    const body = await response.json();
                    console.log(body)
                    if (body.open) {
                        setComPort(body.com)
                        setOnline(true);
                        setConnectDisabled(false);
                        pollServer(1000);
                    }
                    return body; 
                } else {
                    console.log(response);
                    return Error(response);
                }
            } catch {
                return new Error("record error")
            } 
        }
        
    };

    const baudMenu = (
        <Menu onClick={e => clickBaud(e)}>
            <Menu.Item key="115200">
            115200
            </Menu.Item>
            <Menu.Item key="57600">
            57600
            </Menu.Item >
            <Menu.Item key="38400">
            38400
            </Menu.Item>
            <Menu.Item key="19200">
            19200
            </Menu.Item>
            <Menu.Item key="9600">
            9600
            </Menu.Item>
        </Menu>
    );

    const comMenu = (
        <Menu onClick={e => clickCom(e)}>
            <Menu.Item key="COM1">
            COM1
            </Menu.Item>
            <Menu.Item key="COM2">
            COM2
            </Menu.Item >
            <Menu.Item key="COM3">
            COM3
            </Menu.Item>
            <Menu.Item key="COM4">
            COM4
            </Menu.Item>
            <Menu.Item key="COM5">
            COM5
            </Menu.Item>
            <Menu.Item key="COM6">
            COM6
            </Menu.Item>
        </Menu>
    );

    const menu = (
        <Menu onClick={e => clickCamera(e)}>
            <Menu.Item key="C12">
            C12
            </Menu.Item>
            <Menu.Item key="C11">
             C11
            </Menu.Item >
            <Menu.Item key="C10">
            C10
            </Menu.Item>
        </Menu>
    );

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
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          //url="/tiles/auckland/{z}/{x}/{y}.png"
        />
         <ScaleControl name="Scale" className="scale"/>
        {latlng.map((position, idx) =>
            <CircleMarker 
              key={`marker-${idx}`} 
              center={position}
              radius ={5}
              fill={true}
              fillOpacity={1.0}
              color={gnssOnline ? "blue": "red"}
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
            parentShowModal={showModal}
            positions={positions}
            idx={idx}
          />
          )}
           <MapEvents className="events" mouse={mousePosition}/>
      </MapContainer>
      <div className="camera">
            <Card className="camera-card">
                <Card.Body border="secondary">                    
                 <div>
                    <Thumbnail photo={photo}/>
                </div>    
                </Card.Body>
            </Card>
        </div>  
        <div  className="buttons">
            <Space>
            <Button 
                className="mode=btn"
                type="default"
                size="large"
                onClick={clickAuto}
            >{mode}
            </Button>
            <Button 
                className="connect=btn"
                variant="primary"
                size="large"
                disabled={connectDisabled} 
                onClick={clickOnline} 
                >{camera}
            </Button>      
            </Space>
            
        </div>          
        <Row className="tool-menu">
            <Col className="camera-menu" span={10}>
                <Collapse >
                    <svg 
                        className="svg-status" 
                        viewBox="1 1 10 10" x="16" 
                        width="16" 
                        stroke={recording ? "limegreen": "red"} 
                        fill={recording ? "limegreen": "red"} 
                        onClick={clickRecord}
                        >
                        <circle cx="5" cy="5" r="3" />
                    </svg>  
                    <Collapse.Panel 
                        className="camera-panel" 
                        header="CAMERA" 
                        key="1">
                    {cameraData.map((status, idx) =>
                    <div key={`marker-${idx}`} >
                    <div>
                        <b>
                            {"Camera: "}
                        </b>
                        <Dropdown overlay={menu} trigger="click"  className="camera-dropdown">
                            <span className="camera-panel"  onClick={e => e.preventDefault()}>
                            {cameraName}<DownOutlined />
                            </span>
                        </Dropdown >
                    </div>
                        <div className="gps-panel" >
                            <b>Bat: {status.battery}%</b><br></br>
                            <b>Error: {status.error}</b><br></br>
                            <b>Frequency: {status.frequency}</b><br></br>
                            <b>Photo: {status.filename}</b><br></br>
                            <b>Save time: {status.savetime}ms</b>
                        </div>
                    </div>  
                    )}
                    </Collapse.Panel>
                </Collapse>         
            </Col>
            <Col className="gps-menu" span={10}>
                <Collapse >
                    <svg 
                        className="svg-status" 
                        viewBox="1 1 10 10" x="16" 
                        width="16" 
                        stroke={gnssOnline ? "limegreen": "red"} 
                        fill={gnssOnline ? "limegreen": "red"} 
                        onClick={clickGnss}
                        >
                        <circle cx="5" cy="5" r="3" />
                    </svg>       
                    <Collapse.Panel 
                        className="gps-panel" 
                        header="GNSS" 
                        key="1">
                    {gpsData.map((position, idx) =>
                    <div key={`marker-${idx}`} >
                        <div className="gps-panel" >
                            <b>Lat: {position.latitude}</b><br></br>
                            <b>Lng: {position.longitude}</b><br></br>
                            <b>Alt: {position.altitude}m</b><br></br>
                            <b>Sat: {position.satellites}</b><br></br>
                            <b>HDop: {position.hdop}m</b><br></br>
                            <b>Course: {position.course}</b><br></br>
                            <b>Speed: {position.speed}km/hr</b>
                        </div>
                        <div>
                        <b>{"Baud: "}</b>
                        <Dropdown overlay={baudMenu} trigger="click"  className="camera-dropdown">
                            <span className="camera-panel"  onClick={e => e.preventDefault()}>
                            {baud}<DownOutlined />
                            </span>                   
                        </Dropdown ><br></br>
                        </div>  
                        <b>{"COM Port: "}</b>
                        <Dropdown overlay={comMenu} trigger="click"  className="camera-dropdown">
                            <span className="camera-panel"  onClick={e => e.preventDefault()}>
                            {comPort}<DownOutlined />
                            </span>
                        </Dropdown >
                        </div>
                    )}
                    </Collapse.Panel>
                </Collapse>
            </Col>
            
        </Row>
        <Modal title={label + " Grade: " + grade} centered={true} width={400} visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <Space>
            <Button 
                id={1}
                className="grade1"
                type="default"
                size="large"
                onClick={e => clickGrade(e)}
                >
                <b>1</b>
            </Button>
            <Button 
                id={2}
                className="grade2"
                type="default"
                size="large"
                onClick={clickGrade}
                >
                <b>2</b>
            </Button>
            <Button 
                id={3}
                className="grade1=btn"
                type="default"
                size="large"
                onClick={clickGrade}
                >
                <b>3</b>
            </Button>
            <Button 
                id={4}
                className="grade1=btn"
                type="default"
                size="large"
                onClick={clickGrade}
                >
                <b>4</b>
            </Button>
            <Button 
                id={5}
                className="grade1=btn"
                type="default"
                size="large"
                onClick={clickGrade}
                >
                <b>5</b>
            </Button>
            <Button 
                id={0}
                className="grade1=btn"
                type="default"
                size="large"
                onClick={clickGrade}
                >
                <b>Reset</b>
            </Button>
        </Space>
      </Modal>
    </React.Fragment>
  );
}

export default LeafletMap;
