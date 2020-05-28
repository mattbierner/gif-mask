import Modal from '@material-ui/core/Modal';
import * as React from 'react';
import { Gif, loadGifFromUrl } from '../../util/loadGif';
import Search from './search';

interface SearchOverlayProps {
    show: boolean;
    onDidClose: (gif?: Gif) => void;
}

interface SearchOverlayState {
    loadingGif: boolean
    error?: string
}

export class SearchOverlay extends React.Component<SearchOverlayProps, SearchOverlayState> {
    constructor(props: SearchOverlayProps) {
        super(props);
        this.state = {
            loadingGif: false
        };
    }

    render() {
        return (
            <Modal
                open={this.props.show}
                onClose={() => this.onDismiss()}
            >
                <Search
                    visible={this.props.show}
                    title={'Find a Gif'}
                    onGifSelected={(src) => this.onGifSelected(src)}
                    onDismiss={() => this.onDismiss()} />
            </Modal>
        );
    }

    private onDismiss() {
        this.setState({
            loadingGif: false,
            error: undefined
        });
        this.props.onDidClose();
    }

    private onGifSelected(src: string) {
        this.setState({
            loadingGif: true,
            error: undefined
        });

        loadGifFromUrl(src)
            .then(gif => {
                this.setState({
                    loadingGif: false
                });
                this.props.onDidClose(gif);
            })
            .catch(e => {
                console.error(e);
                this.setState({
                    loadingGif: false,
                    error: 'Could not load gif'
                });
            });
    }
}
