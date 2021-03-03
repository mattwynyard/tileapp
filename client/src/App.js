import './App.css';
import { MapContainer, TileLayer, CircleMarker, Marker} from 'react-leaflet';
import L from 'leaflet';
import LeafletMap from './LeafletMap.js'
import {Button}  from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import {  } from 'antd';
import 'antd/dist/antd.css';

class App extends React.Component {

  
  constructor(props) {
    super(props);
    this.state = {

      online: false
    }
   
  }
  componentDidMount() {

  }

  handleOnline = (online) => {
    this.setState({online: online});
  }

  render() {
    return (
      <React.Fragment>
        <LeafletMap>
        {/* <svg className="online" viewBox="1 1 10 10" x="16" width="16" stroke={this.state.online ? "lime": "red"} 
            fill={this.state.online ? "lime": "red"}>
            <circle cx="5" cy="5" r="3" />
          </svg>         */}
        </LeafletMap>
      </React.Fragment>
    );
  } 
}
export default App;