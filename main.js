import { createElement, Component, render } from './toy-react.js'

class MyComponent extends Component{
  constructor() {
    super()
    // 通常state和render关联一起的，在具体组件去实现
    this.state = {
      a: 1,
      b: 2,
    }
  }
  render() {
    return (
      <div class="a" id="b">
        <h1>my component</h1>
        <span>{this.state.a.toString()}</span>
        {this.children}
      </div>
    )
  }
}

render(<MyComponent>
  <div class="ccc">aaa</div>
  <div>bbb</div>
  <div></div>
  <div></div>
</MyComponent>, document.body)
