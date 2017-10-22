import React, { Component } from 'react'
import { Button } from 'reactstrap'
import { Tooltip } from 'reactstrap'
import './bootstrap.min.css'
import './font-awesome.min.css'
import FontAwesome from 'react-fontawesome'
import './App.css'

/**
 * Adds a tooltip widget that pops open on hover
 * Gives an overview of the application
 */
class TooltipSection extends Component {
  constructor(props) {
    super(props)

    this.toggle = this.toggle.bind(this)
    this.state = {
      tooltipOpen: false
    }
  }

  toggle () {
    this.setState({
      tooltipOpen: !this.state.tooltipOpen
    })
  }

  render () {
    return (
      <div className="tooltip-section">
      What is this? <FontAwesome id="tippy" name="question-circle" style={{ color: '#fff' }} />
      <Tooltip placement="right" isOpen={this.state.tooltipOpen} target="tippy" toggle={this.toggle}>
        <p>This is a full-stack application I built using <a href="https://golang.org/">Go</a> and <a href="https://reactjs.org/">React</a>.</p>
        <p>This app will let you scrape data from a website and allow you to download it. In the future, extracting other types of data will also be supported</p>
        <p>It leverages Go&#39;s concurrency model to divide work across CPU cores, so it is FAST.</p>
        <p>I used Docker to package the application and Kubernetes to run it on Google Container Engine.</p>
      </Tooltip>
      </div>
    )
  }
}

/**
 * Main input field of the app
 * Accepts a URL for processing
 */
class Form extends Component {
  constructor(props) {
    super(props)
    this.state = {
      target: '',
    }
  }

  handleTargetChange = (event) => {
    this.setState({ target: event.target.value })
  }

  submitHandler = (e) => {
     e.preventDefault()
     if (typeof this.state.target !== 'undefined' && this.state.target.length > 3) {
        this.props.fetchHandler(this.state.target)
     }
  }

  showErrorMessage (msg) {
    this.setState({
      errorMessage: msg
    })
  }

  render() {
    return (
      <div className="col col-12 form-wrapper">
        <form onSubmit={this.submitHandler}>
          <div className="hidden"><p>{this.state.errorMessage}</p></div>
          <div className="input-group">
            <input className="form-control url-input" placeholder="Enter a URL to rip" type="text" value={this.state.target} onChange = {this.handleTargetChange} />
            <span className="input-group-button">
              <Button className="btn btn-secondary" color="danger" type="submit" onClick={this.submitHandler}>RIP IT</Button>
            </span>
          </div>
        </form>
      </div>
    )
  }
}

class HostnameInfo extends Component {
  constructor(props) {
    super(props)
  }
  render () {

  let hostsArray = Object.keys(this.props.hosts).map((k) => {
    let o = {}
    o.count = this.props.hosts[k]
    if (k == '') k = 'relative (self)'
    o.host = k
    return o
  })

  hostsArray.sort((a, b) => b.count - a.count)

  const hostRows = hostsArray.map((o) => {
    return (
      <tr>
        <td>
          <p>{o.host}</p>
        </td>
        <td>
          <p className="detail">{o.count} times</p>
        </td>
      </tr>
    )
  })

  const HostsTable = () => {
   return (
          <div className="row justify-content-center">
            <div className="col col-12">
              <div className="card card-inverse card-container">
                <div className="card-block">
                  <p className="card-text host-detail">{this.props.target} points to {this.props.hosts.length} hosts</p>
                  {/* Dumb fix for table width bug in bootstrap v4 */}
                  <div class="row justify-content-center">
                    <div class="table-responsive col col-8">
                      <table className="table table-inverse">
                        <tbody>
                          {hostRows}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
    )
  }

  //If we're ready to show results, render the hosts table. Otherwise show nothing
  return (
    <div>
      { this.props.showResults ? <HostsTable /> : null }
    </div>
  )

 }
}

/**
 * Renders the results table once extraction is complete
 * Shows one link per row
 *
 * Allows user to download completed results in CSV format
 */
class ScrapedLinks extends Component {
  constructor(props) {
    super(props)
    this.download = this.download.bind(this)
  }

  //Semi-cross-browser compliant implementation of CSV download
  download () {
    const filename = `pageripper${this.props.target}.csv`
    const data = this.props.links.join('\n')
    const csvData = new Blob([data], {type: 'text/csv;charset=utf-8'})
    if (window.navigator.msSaveBlob)
      window.navigator.msSaveBlob(csvData, filename)
    else
    {
      var link = document.createElement("a");
      link.href = window.URL.createObjectURL(csvData)
      link.setAttribute('download', filename)
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  render () {
      //Rows of links
      const linkRows = this.props.links.map((link, i) => {
        return (
          <tr key={i}>
            <td key={i}>
              <a target="_blank" href={link}>{link}</a>
            </td>
          </tr>
        )
      })

      const LinkTable = () => {
        return (
          <div className="row justify-content-center">
            <div className="col col-12">
              <div className="card card-inverse card-container">
                <div className="card-block">
                  <h3 className="card-title">{this.props.target}</h3>
                  <p className="card-text">Found {this.props.links.length} links in {this.props.processingMilliseconds} milliseconds</p>
                  {/* Dumb fix for table width bug in bootstrap v4 */}
                  <div class="row justify-content-center">
                    <div class="table-responsive col col-8">
                      <table className="table table-inverse">
                        <tbody>
                          {linkRows}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <a className="btn btn-primary btn-download" onClick={this.download}>Download Links</a>
                </div>
              </div>
            </div>
        </div>
        )
      }
      //If we're ready to show results, render the link table. Otherwise show nothing
      return (
        <div>
          { this.props.showResults ? <LinkTable /> : null }
        </div>
      )
  }
}

class UsageMetrics extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div className="usage-metrics">
        <span>This app has ripped <span className="badge badge-danger">{this.props.ripCount}</span> pages</span>
      </div>
    )
  }
}

/**
 * A general purpose error panel that can display
 * various failure states to the user
 */
class ErrorPanel extends Component {
  constructor(props) {
    super(props)
    this.state = { showPanel: false, errorMessage: '' }
    this.dismissErrorHandler = this.props.dismissErrorHandler.bind(this)
  }

  render() {
    const Panel = () => {
      return (
        <div className="hidden card card-inverse">
            <div className="card-block">
              <h3 className="card-title text-warning">Oops, something went wrong!</h3>
              <p className="card-text">{this.props.errorMessage}</p>
              <a className="btn btn-warning" onClick={this.dismissErrorHandler}>OK</a>
            </div>
        </div>
      )
    }
    return this.props.showPanel ? <Panel /> : null
  }
}

class App extends Component {
  constructor() {
    super()

    this.state = {
      links: [],
      hosts: {},
      ripCount: 100
    }
  }

  componentDidMount() {
    this.getRipCount()
  }

  showRequestError(error) {
    this.setState({
      errorMessage: (typeof error.message !== 'undefined') ? error.message : 'Something went wrong. Please try again later',
      showError: true,
      showResults: false
    })
  }

  dismissError() {
    console.log('dismissError')
    this.setState({
      showError: false
    })
  }
  /**
   * Start a timer that can be used
   * to calculate the total round-trip time
   */
  startInitialTimer () {
    this.setState({
      init: new Date()
    })
  }

  /**
   * Diff the start timer with now
   * and parse the results as milliseconds
   */
  getProcessingTime () {
    const complete = new Date()
    let diff = this.state.init - complete
    diff /= 1000
    const milliseconds = Math.abs(diff)
    const seconds = Math.round(diff % 60)
    this.setState({
      processingSeconds: seconds,
      processingMilliseconds: milliseconds
    })
  }

  /**
   * Process errors returned by the backend
   * so that their messages can be displayed
   * to the user. If no message is present,
   * default to displaying the response statusText
   */
  handleHTTPErrors(response) {
    if (!response.ok) {
      const statusText = response.statusText
      return response.json().then(body => {
        throw Error((typeof body.message !== 'undefined') ? body.message : statusText)
      })
    }
    return response.json()
  }

  /**
   * Returns headers common to all fetch requests
   */
  getCommonHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  /**
   * Make a processing request to the
   * backend and update state with
   * the response
   */
  getUrlList (target) {
    this.startInitialTimer()
    this.setState({ showError: false })
    fetch('/api/v1/rip', {
      method: 'POST',
      headers: this.getCommonHeaders(),
      body: JSON.stringify({ target })
   })
   .then(this.handleHTTPErrors)
    .then(body => {
      this.getProcessingTime()
    if (typeof body.links !== 'undefined') {
      this.setUrlListState(target, body.links)
      this.getRipCount()
    }
    if (typeof body.hostnames !== 'undefined') {
      this.setHostnamesState(body.hostnames)
    }
   })
   .catch((error) => {
      console.error(error)
      this.showRequestError(error)
   })
  }

  getRipCount() {
    fetch('/api/v1/count', {
      method: 'GET',
      headers: this.getCommonHeaders()
    })
    .then(this.handleHTTPErrors)
     .then(body => {
        let count = (body.count) ? body.count : 1000
        this.setRipCountState(count)
     })
    .catch((error) => {
      console.error(error)
    })
  }

  setUrlListState(target, links) {
    this.setState({
      target,
      links,
      showResults: true
    })
  }

  setHostnamesState(hosts) {
    this.setState({
      hosts
    })
  }

  setRipCountState(count) {
    this.setState({
      ripCount: count
    })
  }

  render() {

    return (
      <div className="App">
        <div className="container">
          <header className="App-header">
            <div className="row">
              <div className="col col-4">
                <FontAwesome name="gear" size="2x" spin style={{ color: '#fff' }} />
                <h1 className="App-title">PAGE RIPPER</h1>
              </div>
              <div className="col col-4 app-description">
                <p>Get all URLs from a page in CSV format.</p>
              </div>
              <div className="col col-4 app-description">
                 <p><TooltipSection/></p>
                 <p>Created by <a href="https://zackproser.com">Zack Proser</a></p>
              </div>
            </div>
          </header>
          <ErrorPanel
            dismissErrorHandler={this.dismissError.bind(this)}
            showPanel={this.state.showError}
            errorMessage={this.state.errorMessage} />
          <Form fetchHandler={this.getUrlList.bind(this)}/>
          <ScrapedLinks
            showResults={this.state.showResults}
            processingMilliseconds={this.state.processingMilliseconds}
            target={this.state.target}
            links={this.state.links} />
          <HostnameInfo
            showResults={this.state.showResults}
            hosts={this.state.hosts}
            target={this.state.target} />
          <UsageMetrics
            ripCount={this.state.ripCount}/>
        </div>
      </div>
    );
  }
}

export default App;
