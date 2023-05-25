import * as React from 'react';
import { PolygonLayer, PathLayer } from '@deck.gl/layers';
import {
  Container, connectToHarmowareVis, HarmoVisLayers, SimulationDateTime, MovesInput,
  ElapsedTimeRange, ElapsedTimeValue, SpeedValue, SpeedRange,
  PlayButton, PauseButton, ForwardButton, ReverseButton, FpsDisplay, NavigationButton
} from 'harmoware-vis';
import GioDataInput from '../components/gioData-input';

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoieW11Y3lzdGsiLCJhIjoiY2oxdmhhbmd0MDAwYjM4bXd1YWVodWNrcCJ9.aWxoDc0UXMVGB96b82GFKQ'; //Acquire Mapbox accesstoken

const colorPattern = [
  [[0x00,0x93,0x9C],[0x2F,0xA7,0xAE],[0x5D,0xBA,0xBF],[0x8C,0xCE,0xD1],[0xBA,0xE1,0xE2],[0xF8,0xC0,0xAA],[0xEB,0x9C,0x80],[0xDD,0x77,0x55],[0xD0,0x53,0x2B],[0xC2,0x2E,0x00]],
  [[0xFF,0x00,0x00],[0xFF,0x00,0xFF],[0xFF,0xFF,0x00],[0x00,0xFF,0x00],[0x00,0xFF,0xFF],[0x00,0x00,0xFF],[0xFF,0x00,0xFF],[0xFF,0xA5,0x00],[0x9A,0xCD,0x32],[0x40,0xE0,0xD0]],
  [[0xFF,0xCC,0xFF],[0xFF,0xFF,0xCC],[0xCC,0xFF,0xCC],[0xCC,0xFF,0xFF],[0xCC,0xCC,0xFF],[0xFF,0xCC,0xCC],[0xE6,0xE6,0xFA],[0xF5,0xFF,0xFA],[0xFF,0xFA,0xCD],[0xFA,0xFA,0xD2]],
  [[134, 203, 250],[74, 158, 231],[63, 0, 12],[135, 69, 31],[237, 153, 0],[218, 0, 0],[189, 12, 15],[234, 98, 18],[249, 168, 14],[255, 196, 26]],
  [[90, 171, 22],[251, 219, 37],[245, 167, 1],[227, 77, 54],[217, 26, 32],[167, 28, 93],[153, 10, 8],[175, 16, 12],[196, 38, 21],[234, 168, 29]],
  [[156, 179, 148],[193, 207, 186],[245, 236, 215],[245, 226, 191],[240, 199, 153],[235, 175, 162],[199, 183, 158],[223, 215, 198],[189, 151, 136],[94, 110, 121]],
]

class SubContainer extends Container{
  constructor(props){
    super(props)
  }
  resize() {
    this.props.actions.setViewport({
      width: (window.innerWidth/2)-20,
      height: window.innerHeight-20
    });
  }
  render(){
    return (<>{this.props.children}</>)
  }
}

const App = (props)=>{
  const { actions, viewport, movedData, settime, leading, inputFileName,
    timeBegin, timeLength, multiplySpeed, animatePause, animateReverse } = props;
  const { movesFileName1, movesFileName2 } = inputFileName;
  const [elevationScale,setElevationScale] = React.useState(10)
  const [colorPatternNo,setColorPattern] = React.useState(0)
  const [movebase1,setMovebase1] = React.useState({startTime:0,endTime:0,movebase:[]})
  const [movebase2,setMovebase2] = React.useState({startTime:0,endTime:0,movebase:[]})
  const [pathData,setPathData] = React.useState([])
  const [state,setState] = React.useState({ popup: [0, 0, ''] })

  React.useEffect(()=>{
    actions.setLeading(3600);
    actions.setTrailing(0);
    actions.setSecPerHour(1);
    actions.setViewport({
      longitude:136.91825862775616,latitude:35.14001303712759,zoom:11.5
    });
    setTimeout(()=>{StationLineFileRead({setPathData:setPathData})},100);
    setTimeout(()=>{InitialFileRead({actions,fileId:1,setMovebase:setMovebase1})},200);
  },[])

  document.onkeydown = (event)=>{
    const tagName = event.target.tagName
    console.log(`tagName:${tagName}`)
    if(tagName !== "INPUT" && tagName !== "SELECT"){
      const keyName = event.key
      console.log(`keypress:${keyName}`)
      if(keyName === "8"){
        document.getElementById('deckgl-wrapper').focus()
        let setValue = colorPatternNo + 1
        if(setValue > 5){setValue = 0}
        setColorPattern(setValue)
      }
      if(keyName === "7"){
        setElevationScale(elevationScale-1)
      }
      if(keyName === "9"){
        setElevationScale(elevationScale+1)
      }
      if(keyName === "5"){
        actions.setAnimateReverse(!props.animateReverse)
      }
      if(keyName === "4"){
        actions.addMinutes(-60)
      }
      if(keyName === "6"){
        actions.addMinutes(60)
      }
      if(keyName === "2"){
        actions.setAnimatePause(!props.animatePause)
      }
      if(keyName === "1" && props.animatePause === true){
        actions.setTime(props.settime-1)
      }
      if(keyName === "3" && props.animatePause === true){
        actions.setTime(props.settime+1)
      }
      if(keyName === "+"){
        const value = event.shiftKey?0.25:0.5
        const zoom = Math.min(viewport.zoom + value, viewport.maxZoom);
        actions.setViewport({zoom, transitionDuration:100});
      }
      if(keyName === "-"){
        const value = event.shiftKey?0.25:0.5
        const zoom = Math.min(viewport.zoom - value, viewport.maxZoom);
        actions.setViewport({zoom, transitionDuration:100});
      }
      if(keyName === "*"){
        actions.setDefaultViewport(undefined);
      }
      if(keyName === "("){
        const value = props.multiplySpeed - (event.ctrlKey?1:10)
        const multiplySpeed = Math.min(3600*3, Math.max(1, value));
        actions.setMultiplySpeed(multiplySpeed);
      }
      if(keyName === ")"){
        const value = props.multiplySpeed + (event.ctrlKey?1:10)
        const multiplySpeed = Math.min(3600*3, Math.max(1, value));
        actions.setMultiplySpeed(multiplySpeed);
      }
    }
  }

  const setElevationScale_ = (e)=>{
    setElevationScale(+e.target.value);
  }

  const setColorPattern_ = (e)=>{
    setColorPattern(+e.target.value);
  }

  const updateState = (updateData)=>{
    setState({...state, ...updateData})
  }

  const onHover = (el)=>{
    if (el && el.object && el.layer) {
      if(el.layer.id === "PathLayer1"){
        const disptext = `${el.object.N02_003}\n${el.object.N02_005}`
        updateState({ popup: [el.x, el.y, disptext] });
      }else
      if(el.layer.id === "PathLayer2"){
        const shift = window.innerWidth/2
        const disptext = `${el.object.N02_003}\n${el.object.N02_005}`
        updateState({ popup: [el.x+shift, el.y, disptext] });
      }else
      if(el.layer.id === "PolygonLayer1"){
        const disptext = `mid:${el.object.mid}\nuserCnt:${el.object.userCnt}`
        updateState({ popup: [el.x, el.y, disptext] });
      }else
      if(el.layer.id === "PolygonLayer2"){
        const shift = window.innerWidth/2
        const disptext = `mid:${el.object.mid}\nuserCnt:${el.object.userCnt}`
        updateState({ popup: [el.x+shift, el.y, disptext] });
      }else{
        updateState({ popup: [0, 0, ''] });
      }
    } else {
      updateState({ popup: [0, 0, ''] });
    }
  }

  const movedData1 = movedData.filter((x)=>x.fileId === 1)
  const movedData2 = movedData.filter((x)=>x.fileId === 2)

  return (
    <SubContainer {...props}>
      <div className="harmovis_controller">
        <ul>
          <li className="flex_row">
            <div className="harmovis_input_button_column">
            <label htmlFor="GioDataInput1">
              Data 1<GioDataInput {...props} id="GioDataInput1" fileId={1} movebase={movebase2} setMovebase={setMovebase1}/>
            </label>
            <div>{movesFileName1}</div>
            </div>
          </li>
          <li className="flex_row">
            <div className="harmovis_input_button_column">
            <label htmlFor="GioDataInput2">
              Data 2<GioDataInput {...props} id="GioDataInput2" fileId={2} movebase={movebase1} setMovebase={setMovebase2}/>
            </label>
            <div>{movesFileName2}</div>
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
          <li className="flex_row">
            <NavigationButton buttonType="zoom-in" actions={actions} viewport={viewport} />
            <NavigationButton buttonType="zoom-out" actions={actions} viewport={viewport} />
          </li>
          <li className="flex_column">
            <label htmlFor="ElapsedTimeRange">経過時間
            <ElapsedTimeValue settime={settime} timeBegin={timeBegin} timeLength={timeLength} actions={actions} min={leading*-1} />&nbsp;/&nbsp;
            <input type="number" value={timeLength} onChange={e=>actions.setTimeLength(+e.target.value)} className="harmovis_input_number" min={0} max={timeLength} />&nbsp;秒
            </label>
            <ElapsedTimeRange settime={settime} timeLength={timeLength} timeBegin={timeBegin} actions={actions} min={leading*-1} id="ElapsedTimeRange" />
          </li>
          <li className="flex_column">
            <label htmlFor="SpeedRange">スピード<SpeedValue maxmultiplySpeed={3600*3} multiplySpeed={multiplySpeed} actions={actions} />倍速</label>
            <SpeedRange maxmultiplySpeed={3600*3} multiplySpeed={multiplySpeed} actions={actions} id="SpeedRange" />
          </li>
          <li className="flex_column">
            <label htmlFor="elevationScale">高さスケール
            <input type="number" value={elevationScale} min={1} max={100} onChange={setElevationScale_} id="elevationScale" className="harmovis_input_number" />
            </label>
            <input type="range" value={elevationScale} min={1} max={100} step={1} onChange={setElevationScale_} id="elevationScale" className="harmovis_input_range" />
          </li>
          <li className="flex_column">
            <div className="form-select">
              <label htmlFor="ColorSelect">配色選択</label>
              <select id="ColorSelect" value={colorPatternNo} onChange={setColorPattern_} className="harmovis_select" >
              <option value={0}>デフォルト</option>
              <option value={1}>パターン１</option>
              <option value={2}>パターン２</option>
              <option value={3}>パターン３</option>
              <option value={4}>パターン４</option>
              <option value={5}>パターン５</option>
              </select>
            </div>
          </li>
        </ul>
      </div>
      <div className="harmovis_area" id="parent">
        <div id="parent">
          <div id="child">
            <HarmoVisLayers
              viewport={viewport} actions={actions}
              mapboxApiAccessToken={MAPBOX_TOKEN}
              layers={[
                new PathLayer({
                  id: 'PathLayer1',
                  data: pathData,
                  getPath: x=>x.path,
                  getWidth: 10,
                  getColor: [0,255,0,255],
                  widthUnits: 'meters',
                  widthMinPixels: 1,
                  capRounded: true,
                  billboard: true,
                  pickable: true,
                  onHover
                }),
                new PolygonLayer({
                  id: 'PolygonLayer1',
                  data: movedData1,
                  getPolygon:(x)=>x.coordinates,
                  getElevation:(x)=>x.userCnt,
                  getFillColor:(x)=>colorPattern[colorPatternNo][x.colorCls],
                  stroked:false,
                  elevationScale:elevationScale,
                  extruded:true,
                  opacity: 0.5,
                  pickable: true,
                  onHover
                }),
              ]}
            />
          </div>
          <div id="child">
            <HarmoVisLayers
              viewport={viewport} actions={actions}
              mapboxApiAccessToken={MAPBOX_TOKEN}
              layers={[
                new PathLayer({
                  id: 'PathLayer2',
                  data: pathData,
                  getPath: x=>x.path,
                  getWidth: 10,
                  getColor: [0,255,0,255],
                  widthUnits: 'meters',
                  widthMinPixels: 1,
                  capRounded: true,
                  billboard: true,
                  pickable: true,
                  onHover
                }),
                new PolygonLayer({
                  id: 'PolygonLayer2',
                  data: movedData2,
                  getPolygon:(x)=>x.coordinates,
                  getElevation:(x)=>x.userCnt,
                  getFillColor:(x)=>colorPattern[colorPatternNo][x.colorCls],
                  stroked:false,
                  elevationScale:elevationScale,
                  extruded:true,
                  opacity: 0.5,
                  pickable: true,
                  onHover
                }),
              ]}
            />
          </div>
        </div>
      </div>
      <svg width={window.innerWidth} height={window.innerHeight} className="harmovis_overlay">
        <g fill="white" fontSize="12">
          {state.popup[2].length > 0 ?
            state.popup[2].split('\n').map((value, index) =>
              <text
                x={state.popup[0] + 20} y={state.popup[1] + (index * 12)}
                key={index.toString()}
              >{value}</text>) : null
          }
        </g>
      </svg>
      <FpsDisplay />
    </SubContainer>
  );
}
export default connectToHarmowareVis(App);

const InitialFileRead = (props)=>{
  const { actions, fileId, setMovebase } = props;
  const request = new XMLHttpRequest();
  request.open('GET', 'json/timeseriesPopulationChange_officeWorker_2019-04_isWeekend-1_timezone-0~48.geojson');
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

    let minElapsedtime = 2147483647;
    let maxElapsedtime = -2147483648;
    const movebase = readdata.features.reduce((movebase,features)=>{
      const {geometry, properties} = features;
      const {coordinates} = geometry
      const {mid, times, userCnt, colorCls} = properties
      const elapsedtime = Date.parse(times)/1000
      const nextelapsedtime = elapsedtime + 3599
      const idx = movebase.findIndex((x)=>x.mid === mid)
      if(idx < 0){
        movebase.push({mid,fileId,test:100,operation:[
          {elapsedtime,coordinates,userCnt:+userCnt,colorCls},
          {elapsedtime:nextelapsedtime,coordinates,userCnt:+userCnt,colorCls}
        ]})
      }else{
        movebase[idx].operation.push({elapsedtime,coordinates,userCnt:+userCnt,colorCls})
        movebase[idx].operation.push({elapsedtime:nextelapsedtime,coordinates,userCnt:+userCnt,colorCls})
        movebase[idx].operation.sort((a, b) => (a.elapsedtime - b.elapsedtime))
      }
      minElapsedtime = Math.min(minElapsedtime,elapsedtime);
      maxElapsedtime = Math.max(maxElapsedtime,nextelapsedtime);
      return movebase;
    },[]);
    const key = `movesFileName${fileId}`
    actions.setInputFilename({ [key]: 'timeseriesPopulationChange_officeWorker_2019-04_isWeekend-1_timezone-0~48.geojson' });
    actions.setTimeBegin(minElapsedtime)
    actions.setTimeLength(maxElapsedtime - minElapsedtime)
    actions.setMovesBase(movebase);
    setMovebase({startTime:minElapsedtime, endTime:maxElapsedtime, movebase})
    actions.setAnimatePause(false);
    actions.setAnimateReverse(false);
  }
}
const StationLineFileRead = (props)=>{
  const request = new XMLHttpRequest();
  request.open('GET', 'json/stationLineData.geojson');
  request.responseType = 'text';
  request.send();
  request.onload = function() {
    let readdata = null;
    try {
      readdata = JSON.parse(request.response);
    } catch (exception) {
      return;
    }
    const features = readdata.features.filter((x)=>{
      if(x.geometry && x.geometry.type && x.geometry.type === "MultiLineString" && x.geometry.coordinates){
        const result = x.geometry.coordinates.reduce((res,point)=>{
          if(res){
            const [longitude,latitude] = point[0]
            if(longitude <136.70127495620113 || 137.05789111959018 < longitude ||
              latitude < 34.86600330724259 || 35.32177395881559 < latitude){
              res = false
            }
          }
          return res
        },true)
        return result
      }
      return false
    })
    const pathData = features.reduce((pathData,features)=>{
      const {geometry, properties} = features;
      const {coordinates, ...gioOther} = geometry
      pathData.push({...properties, ...gioOther, path:coordinates[0]})
      return pathData;
    },[]);
    console.log({pathData})
    props.setPathData(pathData)
  }
}
