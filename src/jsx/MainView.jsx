import React from 'react';
import {Navigator} from '@readium/navigator-web/dist/readium-navigator-web.esm.js';


export default class MainView extends React.Component {
    constructor (props) {
        super(props);

        let nav=new Navigator()
        console.log('nav',nav)
    }

    render () {
        return (

            <div className='MainView'>
                TRYING HARD
            </div>
        );
    }
}
