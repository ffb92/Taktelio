import React,{Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';
class ErrorBoundary extends Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="grid min-h-dvh place-items-center bg-background px-6 text-center"><div className="max-w-sm space-y-3"><h1 className="text-2xl font-semibold tracking-tight">Taktelio</h1><p className="text-sm leading-relaxed text-muted-foreground">Die Ansicht konnte nicht geladen werden. Deine gespeicherten Daten bleiben erhalten.</p><button type="button" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={()=>location.reload()}>Erneut laden</button></div></main>:this.props.children}
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
