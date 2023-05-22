import * as React from 'react';

export default class GioDataInput extends React.Component {
  onSelect(e) {
    const { actions, fileId } = this.props;
    const reader = new FileReader();
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    actions.setMovesBase([]);
    this.props.setMovebase({startTime:0,endTime:0,movebase:[]})
    reader.readAsText(file);
    const file_name = file.name;
    reader.onload = () => {
      let readdata = null;
      try {
        readdata = JSON.parse(reader.result.toString());
      } catch (exception) {
        window.alert(exception);
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
      actions.setInputFilename({ [key]: file_name });
      if(this.props.movebase.movebase.length === 0){
        actions.setTimeBegin(minElapsedtime)
        actions.setTimeLength(maxElapsedtime - minElapsedtime)
        actions.setMovesBase(movebase);
      }else{
        const startTime = Math.min(minElapsedtime,this.props.movebase.startTime)
        const endTime = Math.max(maxElapsedtime,this.props.movebase.endTime)
        actions.setTimeBegin(startTime)
        actions.setTimeLength(endTime - startTime)
        const newmovebase = [...movebase, ...this.props.movebase.movebase]
        actions.setMovesBase(newmovebase.map((data,idx)=>{
          return {...data, movesbaseidx:idx}
        }));
      }
      this.props.setMovebase({startTime:minElapsedtime, endTime:maxElapsedtime, movebase})
      actions.setAnimatePause(false);
      actions.setAnimateReverse(false);
    };
  }

  onClick(e) {
    const { actions, fileId, movebase } = this.props;
    if(movebase.movebase.length === 0){
      actions.setTimeBegin(0)
      actions.setTimeLength(0)
      actions.setMovesBase([]);
    }else{
      actions.setTimeBegin(movebase.startTime)
      actions.setTimeLength(movebase.endTime - movebase.startTime)
      actions.setMovesBase(movebase.movebase.map((data,idx)=>{
        return {...data, movesbaseidx:idx}
      }));
    }
    const key = `movesFileName${fileId}`
    actions.setInputFilename({ [key]: null });
    this.props.setMovebase({startTime:0,endTime:0,movebase:[]})
    e.target.value = '';
  }

  render() {
    const { id, className, style } = this.props;

    return (
      <input type="file" accept=".geojson"
      id={id} className={className} style={style}
      onClick={this.onClick.bind(this)}
      onChange={this.onSelect.bind(this)}
      />
    );
  }
}
