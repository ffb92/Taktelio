import React,{Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
class ErrorBoundary extends Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="authWrap"><h1>Taktelio</h1><p>Die Ansicht konnte nicht geladen werden. Deine gespeicherten Daten bleiben erhalten.</p><button onClick={()=>location.reload()}>Erneut laden</button></main>:this.props.children}
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
