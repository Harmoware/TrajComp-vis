import React from 'react';
import { GridCellLayer } from '@deck.gl/layers';
import {
  Container, connectToHarmowareVis, HarmoVisLayers, SimulationDateTime, MovesInput,
  ElapsedTimeRange, ElapsedTimeValue, SpeedValue, SpeedRange,
  PlayButton, PauseButton, ForwardButton, ReverseButton, FpsDisplay
} from 'harmoware-vis';
import GridCellDataInput from '../components/gridCellData-input';

const MAPBOX_TOKEN = 'pk.eyJ1IjoieW11Y3lzdGsiLCJhIjoiY2oxdmhhbmd0MDAwYjM4bXd1YWVodWNrcCJ9.aWxoDc0UXMVGB96b82GFKQ'; //Acquire Mapbox accesstoken

class App extends Container {
  constructor(props) {
    super(props);
    this.props.actions.setExtractedDataFunc(this.getExtractedDataFunc.bind(this));
    this.props.actions.setLeading(0);
    this.props.actions.setTrailing(0);
    this.props.actions.setSecPerHour(60);
    this.props.actions.setViewport({
      longitude:137.46942143342378,latitude:35.60524064943615,zoom:10.0
    });
    this.state = {
      gridcelldataDic:{},
      gridcelldataArray:[]
    };
  }

  componentDidMount(){
    setTimeout(()=>{InitialFileRead({actions:this.props.actions,
      setGridcelldataDic:this.setGridcelldataDic.bind(this),
      setGridcelldataArray:this.setGridcelldataArray.bind(this)})},100);
  }

  getExtractedDataFunc(props){
    const {settime} = props;
    const {gridcelldataArray} = this.state;
    const index = gridcelldataArray.findIndex((x)=>x.elapsedtime < settime)
    if(index >= 0){
      return [gridcelldataArray[index]];
    }
    return [];
  }

  setGridcelldataDic(gridcelldataDic){
    this.setState({gridcelldataDic});
  }
  setGridcelldataArray(gridcelldataArray){
    this.setState({gridcelldataArray});
  }

  render() {
    const { actions, inputFileName, viewport, movedData, settime, leading, ExtractedData,
      timeBegin, timeLength, secperhour, animatePause, animateReverse } = this.props;
    const { movesFileName } = inputFileName;
    const gridcelldata = movedData.filter((x)=>x.gridcelldata);

    return (
      <div>
        <div className="harmovis_controller">
          <ul>
            <li className="flex_row">
              <a href="json/sample_data.json" download>Sample Data Download</a>
            </li>
            <li className="flex_row">
              <div className="harmovis_input_button_column">
              <label htmlFor="MovesInput">
                Operation data<GridCellDataInput actions={actions} id="MovesInput"
                setGridcelldataDic={this.setGridcelldataDic.bind(this)}
                setGridcelldataArray={this.setGridcelldataArray.bind(this)} />
              </label>
              <div>{movesFileName}</div>
              </div>
            </li>
            <li className="flex_column">
              再現中日時&nbsp;<SimulationDateTime settime={settime} />
            </li>
            <li className="flex_row">
                {animatePause ?
                  <PlayButton actions={actions} /> :
                  <PauseButton actions={actions} />
                }
                {animateReverse ?
                  <ForwardButton actions={actions} /> :
                  <ReverseButton actions={actions} />
                }
            </li>
            <li>
              開始 UNIX TIME 設定&nbsp;<input type="number" value={timeBegin} onChange={e=>actions.setTimeBegin(+e.target.value)} className="harmovis_input_number" />
            </li>
            <li className="flex_column">
              <label htmlFor="ElapsedTimeRange">経過時間
              <ElapsedTimeValue settime={settime} timeBegin={timeBegin} timeLength={timeLength} actions={actions} min={leading*-1} />&nbsp;/&nbsp;
              <input type="number" value={timeLength} onChange={e=>actions.setTimeLength(+e.target.value)} className="harmovis_input_number" min={0} max={timeLength} />&nbsp;秒
              </label>
              <ElapsedTimeRange settime={settime} timeLength={timeLength} timeBegin={timeBegin} actions={actions} min={leading*-1} id="ElapsedTimeRange" />
            </li>
            <li className="flex_column">
              <label htmlFor="SpeedRange">スピード<SpeedValue secperhour={secperhour} actions={actions} />秒/時</label>
              <SpeedRange secperhour={secperhour} actions={actions} id="SpeedRange" />
            </li>
          </ul>
        </div>
        <div className="harmovis_area">
          <HarmoVisLayers
            viewport={viewport} actions={actions}
            mapboxApiAccessToken={MAPBOX_TOKEN}
            terrain={true}
            layers={[
              !ExtractedData && gridcelldata.length > 0  ?
              gridcelldata.map((data,idx)=>{
                if(this.state.gridcelldataDic[data.gridcelldata]){
                  return new GridCellLayer({
                    id: 'xband-mesh-layer-' + String(idx),
                    data: this.state.gridcelldataDic[data.gridcelldata],
                    getElevation:(x)=>x.elevation,
                    getFillColor:(x)=>x.color,
                    opacity: 0.3,
                    cellSize: 220,
                    elevationScale: 10,
                    pickable: true
                  })
                }else{
                  return null;
                }
              }):null,
              ExtractedData ?
              ExtractedData.map((data,idx)=>{
                return new GridCellLayer({
                  id: 'xband-mesh-layer-ExtractedData-' + String(idx),
                  data: data.gridcelldata,
                  getElevation:(x)=>x.elevation,
                  getFillColor:(x)=>x.color,
                  opacity: 0.3,
                  cellSize: 220,
                  elevationScale: 10,
                  pickable: true
                })
              }):null
            ]}
          />
        </div>
        <FpsDisplay />
      </div>
    );
  }
}
export default connectToHarmowareVis(App);

const InitialFileRead = (props)=>{
  const { actions, setGridcelldataDic, setGridcelldataArray } = props;
  const request = new XMLHttpRequest();
  request.open('GET', 'json/sample_data.json');
  request.responseType = 'text';
  request.send();
  actions.setMovesBase([]);
  request.onload = function() {
    let readdata = null;
    try {
      readdata = JSON.parse(request.response);
    } catch (exception) {
      return;
    }
    console.log({readdata})
    const gridcelldataDic = {};
    const gridcelldataArray = []
    let minElapsedtime = 2147483647;
    let maxElapsedtime = -2147483648;
    const movebase = readdata.reduce((movebase,readdataelement)=>{
      const {meshId, operation:sourceoperation, ...other1} = readdataelement;
      const operation = sourceoperation.reduce((operation,operationelement)=>{
          const {gridcelldata, elapsedtime, ...other2} = operationelement;
          minElapsedtime = Math.min(minElapsedtime,elapsedtime);
          maxElapsedtime = Math.max(maxElapsedtime,elapsedtime);
          const key = meshId+String(elapsedtime);
          gridcelldataDic[key] = gridcelldata;
          gridcelldataArray.push({elapsedtime,gridcelldata});
          operation.push({gridcelldata:key, elapsedtime, ...other2});
          return operation;
      },[]);
      movebase.push({meshId, operation, ...other1});
      return movebase;
    },[]);
    setGridcelldataDic(gridcelldataDic)
    setGridcelldataArray(gridcelldataArray.sort((a,b)=>a.elapsedtime < b.elapsedtime?1:-1))
    actions.setInputFilename({ movesFileName: 'sample_data.json' });
    actions.setTimeBegin(minElapsedtime)
    actions.setTimeLength(maxElapsedtime - minElapsedtime)
    actions.setAnimatePause(false);
    actions.setAnimateReverse(false);
  }
}
