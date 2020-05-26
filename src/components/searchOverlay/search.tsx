import * as React from 'react';
import { getGiphy } from '../../giphy';
import { useFocus } from '../../util/useFocus';
import { LoadingSpinner } from '../loading_spinner';

interface GiphyGifData {
    readonly images: {
        readonly downsized_still: { readonly url: string };
        readonly downsized: { readonly url: string };
        readonly downsized_medium: { readonly url: string };
    };
}

interface SearchResultProps {
    data: GiphyGifData;
    onGifSelected: (data: GiphyGifData) => void;
}


interface SearchResultState {
    active: boolean
    selected: boolean
}

/**
 * Gif search result
 */
class SearchResult extends React.Component<SearchResultProps, SearchResultState> {
    constructor(props: SearchResultProps) {
        super(props);
        this.state = {
            active: false,
            selected: false
        };
    }

    onMouseOver() {
        this.setState({ active: true });
    }

    onMouseOut() {
        this.setState({ active: false });
    }

    onSelect() {
        this.props.onGifSelected(this.props.data);
    }

    onTouchDown() {
        if (this.state.active) {
            this.setState({ selected: true });
        }
    }

    onScrollLeave() {
        this.setState({ active: false });
    }

    render() {
        const still = this.props.data.images.downsized_still;
        const animated = this.props.data.images.downsized;

        return (
            <li className={"search-result " + (this.state.active ? 'active' : '')}
                onMouseDown={this.onSelect.bind(this)}
                onMouseOver={this.onMouseOver.bind(this)}
                onMouseOut={this.onMouseOut.bind(this)}>
                <figure className="preview" >
                    <img className="still" src={still.url} />
                    <img style={{ display: this.state.active ? 'block' : 'none' }} className="animated" src={this.state.active ? animated.url : ''} />
                </figure>
            </li>
        );
    }
}

interface GifSearchBarProps {
    visible: boolean;
    searchText: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearch: (text: string) => void;
}

/**
 * Search bar for entering text
 */
function GifSearchBar(props: GifSearchBarProps) {
    const [inputRef] = useFocus();

    const onSearch = React.useCallback(() => {
        props.onSearch(props.searchText);
    }, []);

    const onKeyPress = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch();
        }
    }, []);

    return (
        <div className="gif-search-bar content-wrapper">
            <button onMouseDown={onSearch}><span className="material-icons">search</span></button>
            <input type='text'
                ref={inputRef}
                value={props.searchText}
                placeholder="find a gif"
                onKeyPress={onKeyPress}
                onChange={props.onChange} />
        </div>
    );
}


interface GifSearchResultsProps {
    results: GiphyGifData[];
    query: string
    onGifSelected: (gif: GiphyGifData) => void
    loading: boolean
}

/**
 * Displays list of gif search results
 */
class GifSearchResults extends React.Component<GifSearchResultsProps> {
    render() {
        let results;
        if (this.props.results && this.props.results.length === 0) {
            if (!this.props.loading) {
                results = <div>No gifs found</div>;
            }
        } else if (this.props.results) {
            results = this.props.results.map((x, i) =>
                <SearchResult key={i} data={x}
                    onGifSelected={this.props.onGifSelected} />);
        }

        return (
            <ul className="search-results">{results}</ul>
        );
    }
}

interface SearchProps {
    title: string
    onGifSelected: (gif: string) => void

    onDismiss: () => void;
    visible: boolean;
}

interface SearchState {
    searchText: string;
    query: string; // search term for current results
    loading: boolean;
    results: any;

    hasMore: boolean
    offset: number
}

/**
 * Gif search control.
 */
export default class Search extends React.Component<SearchProps, SearchState> {
    constructor(props: SearchProps) {
        super(props);
        this.state = {
            searchText: '',
            query: '',
            loading: false,
            results: null,
            hasMore: false,
            offset: 0
        };
    }

    componentWillMount() {
        document.addEventListener('keydown', e => {
            if (!this.props.visible) {
                return;
            }

            if (e.keyCode === 27) { // escape
                this.props.onDismiss();
            }
        });
    }

    componentWillReceiveProps(newProps: SearchProps) {
        if (!newProps.visible && this.props.visible) {
            this.state = {
                searchText: '',
                query: '',
                loading: false,
                results: null,
                hasMore: false,
                offset: 0
            };
        }
    }

    private onSearchTextChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const value = e.target.value;
        this.setState({ searchText: value });
    }

    private search() {
        this.setState({
            loading: true,
            query: this.state.searchText,
            results: [],
            hasMore: false,
            offset: 0
        });

        this.doSearch(this.state.searchText, 0);
    }

    private doSearch(searchText: string, offset: number) {
        getGiphy().search({ q: searchText, offset: offset })
            .then((res: any) => {
                if (searchText !== this.state.searchText) {
                    return;
                }

                this.setState({
                    results: this.state.results.concat(res.data),
                    loading: false,
                    offset: res.pagination.offset + res.data.length,
                    hasMore: res.pagination.count + res.pagination.offset < res.pagination.total_count
                });
            })
            .catch((err: Error) => {
                console.error(err);
                this.setState({
                    loading: false,
                    hasMore: false
                });
            });
    }

    private onGifSelected(data: GiphyGifData) {
        const src = data.images.downsized_medium.url;
        this.props.onGifSelected(src);
    }

    private onMore(): void {
        this.doSearch(this.state.searchText, this.state.offset);
    }

    render() {
        let more: JSX.Element | undefined = undefined;
        if (this.state.hasMore) {
            more = <button className='more-button' onMouseDown={this.onMore.bind(this)}>Load More</button>;
        }
        return (
            <div className='gif-search-wrapper' style={{ 'display': 'flex' }}>
                <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: -1 }} onMouseDown={this.props.onDismiss} />
                <div className='gif-search'>
                    <div className='gif-search-header'>
                        <h2>{this.props.title}</h2>
                        <button className='material-icons' onMouseDown={this.props.onDismiss}>close</button>
                    </div>
                    <div>
                        <GifSearchBar
                            visible={this.props.visible}
                            searchText={this.state.searchText}
                            onChange={e => this.onSearchTextChange(e)}
                            onSearch={this.search.bind(this)} />
                    </div>
                    <div className="search-label">{this.state.query}</div>

                    <LoadingSpinner active={this.state.loading} />

                    <div className='search-results-container'>
                        <GifSearchResults {...this.state}
                            onGifSelected={this.onGifSelected.bind(this)} />
                        {more}
                    </div>

                    <div className='spacer' />

                    <a href='http://giphy.com/' style={{
                        margin: '1em',
                    }}>
                        <img src='images/PoweredBy_200px-White_HorizText.png' alt='Powered by Giphy' />
                    </a>
                </div>
            </div>
        );
    }
}
