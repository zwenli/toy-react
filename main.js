import { createElement, Component, render } from './toy-react.js'

class MyComponent extends Component{
  render() {
    return <div>
      <h1>my component</h1>
      {this.children}
    </div>
  }
}

render(<MyComponent class="a" id="b">
  <div class="ccc">1</div>
  <div>2</div>
</MyComponent>, document.body)
