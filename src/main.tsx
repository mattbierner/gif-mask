import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import * as ReactDOM from 'react-dom';
import { CreateView } from './views/main';

function App() {
    return (
        <DndProvider backend={HTML5Backend}>
            <CreateView />
        </DndProvider>
    );
}

ReactDOM.render(
    <App />,
    document.getElementById('content'));
