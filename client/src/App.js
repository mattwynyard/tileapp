import './App.css';
import LeafletMap from './LeafletMap.js'
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import {  } from 'antd';
import 'antd/dist/antd.css';



class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
    }
   
  }
  componentDidMount() {
  }

  render() {
    return (
      <React.Fragment>
        <LeafletMap>
        </LeafletMap>
        
      </React.Fragment>
      
    );
  } 
}
export default App;