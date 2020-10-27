const RENDER_TO_DOM = Symbol('render to dom')

// Component 基类，不能直接使用，自定义组件继承它，实现render函数
export class Component {
  constructor() {
    this.props = Object.create(null)
    this.children = []
    this._root = null
    this._range = null
  }
  setAttribute(name, value) {
    this.props[name] = value
  }
  appendChild(component) {
    // 这里并不是原始DOM，先把children保存，之后render再处理
    this.children.push(component)
  }
  get vdom() {
    // 递归调用
    return this.render().vdom
  }
  // 此方法必须由组件实现
  render() {}
  // 改造成基于range操作dom，方便后续rerender
  [RENDER_TO_DOM](range) {
    this._range = range
    this._vdom = this.vdom
    this._vdom[RENDER_TO_DOM](range)
  }
  update() {
    const isSameNode = (oldNode, newNode) => {
      
      if (oldNode.type !== newNode.type) {
        return false
      }
      
      for (let name in oldNode.props) {
        if (oldNode.props[name] !== newNode.props[name]) {
          return false
        }
      }
      // 旧props比新多，也当不是同节点
      if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length) {
        return false
      }
      
      if (oldNode.type === '#text') {
        if (oldNode.content !== newNode.content) {
          return false
        }
      }
      return true
    }
    const _update = (oldNode, newNode) => {
      // type, props, children
      // #text content
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_TO_DOM](oldNode._range)
        return
      }
      
      newNode._range = oldNode._range
      
      const newChildren = newNode.vchildren
      const oldChildren = oldNode.vchildren
      
      if (!newChildren || !newChildren.length) {
        return
      }
      let tailRange = oldChildren[oldChildren.length - 1]._range
      
      
      for (let i = 0; i < newChildren.length; i += 1) {
        const newChild = newChildren[i]
        const oldChild = oldChildren[i]
        if (i < oldChildren.length) {
          _update(oldChild, newChild)
        } else {
          // todo
          const range = document.createRange()
          range.setStart(tailRange.endContainer, tailRange.endOffset)
          range.setEnd(tailRange.endContainer, tailRange.endOffset)
          newChild[RENDER_TO_DOM](range)
          tailRange = range
        }
      }
    }
    const vdom = this.vdom
    // 新旧VDOMDiff
    _update(this._vdom, vdom)
    this._vdom = vdom
  }
  // rerender() {
  //   // 清空range的内容，重新渲染
  //   // 原来的直接删除，
  //   let oldRange = this._range
    
  //   const range = document.createRange()
  //   range.setStart(oldRange.startContainer, oldRange.startOffset)
  //   range.setEnd(oldRange.startContainer, oldRange.startOffset)
  //   this[RENDER_TO_DOM](range)
    
  //   oldRange.setStart(range.endContainer, range.endOffset)
  //   oldRange.deleteContents()
  // }
  setState(newState) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState
      this.update()
      return
    }
    const merge = (oldState, newState) => {
      for (let key in newState) {
        if (oldState[key] === null || typeof oldState[key] !== 'object') {
          oldState[key] = newState[key]
        } else if (newState[key] === null || typeof newState[key] !== 'object') {
          oldState[key] = newState[key]
        } else {
          merge(oldState[key], newState[key])
        }
      }
    }
    merge(this.state, newState)
    this.update()
  }
}

class ElementWrapper extends Component {
  constructor(type) {
    super()
    this.type = type
  }
  get vdom() {
    this.vchildren = this.children.map(child => child.vdom)
    return this
    // {
    //   type: this.type,
    //   props: this.props,
    //   children: this.children.map(child => child.vdom)
    // }
  }
  // get vchildren() {
  //   return this.children.map(child => child.vdom)
  // }
  // setAttribute(name, value) {
  //   // 事件处理
  //   if (name.match(/^on([\s\S]+)/)) {
  //     const eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase())
  //     this.root.addEventListener(eventName, value)
  //   } else {
  //     if (name === 'className') {
  //       this.root.setAttribute('class', value)
  //     } else {
  //       this.root.setAttribute(name, value)
  //     }
  //   }
  // }
  // appendChild(component) {
  //   const range = document.createRange()
  //   // 每次appendChild，都是最后一个
  //   range.setStart(this.root, this.root.childNodes.length)
  //   range.setEnd(this.root, this.root.childNodes.length)
  //   component[RENDER_TO_DOM](range)
  // }
  [RENDER_TO_DOM](range) {
    this._range = range
    // range.deleteContents()
    const root = document.createElement(this.type)
    // 事件处理
    for (let name in this.props) {
      const value = this.props[name]
      if (name.match(/^on([\s\S]+)/)) {
        const eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase())
        root.addEventListener(eventName, value)
      } else {
        if (name === 'className') {
          root.setAttribute('class', value)
        } else {
          root.setAttribute(name, value)
        }
      }
    }
    
    if (!this.vchildren) {
      this.vchildren = this.children.map(child => child.vdom)
    }
    
    for (let child of this.vchildren) {
      const childRange = document.createRange()
      // 每次appendChild，都是最后一个
      childRange.setStart(root, root.childNodes.length)
      childRange.setEnd(root, root.childNodes.length)
      child[RENDER_TO_DOM](childRange)
    }
    
    // range.insertNode(root)
    replaceContent(range, root)
  }
}

class TextWrapper extends Component {
  constructor(content) {
    super()
    this.type = '#text'
    this.content = content
  }
  get vdom() {
    return this
  }
  [RENDER_TO_DOM](range) {
    this._range = range
    // range.deleteContents()
    const root = document.createTextNode(this.content)
    replaceContent(range, root)
  }
}


function replaceContent(range, node) {
  range.insertNode(node)

  range.setStartAfter(node)
  range.deleteContents()

  range.setStartBefore(node)
  range.setEndAfter(node)
}

export function createElement(type, attributes, ...children) {
  let element = null
  if (typeof type === 'string') {
    element = new ElementWrapper(type)
  } else {
    // 自定义的组件正常是无法正常渲染出dom的，这时候需要对原生的DOM进行wrap包装
    element = new type()
  }

  for (let name in attributes) {
      element.setAttribute(name, attributes[name])
  }
  
  let insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === 'string') {
        child = new TextWrapper(child)
      }
      if (child === null) {
        continue
      }
      if (typeof child === 'object' && child instanceof Array) {
        insertChildren(child)
      } else {
        element.appendChild(child)
      }
    }
  }

  insertChildren(children)
  return element
}

export function render(component, parentElement) {
  // parentElement.appendChild(component.root)
  const range = document.createRange()
  range.setStart(parentElement, 0)
  range.setEnd(parentElement, parentElement.childNodes.lenght)
  // 清空父元素内的所有内容
  range.deleteContents()
  component[RENDER_TO_DOM](range)
}