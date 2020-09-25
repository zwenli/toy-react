const RENDER_TO_DOM = Symbol('render to dom')

class ElementWrapper {
  constructor(tagName) {
    this.root = document.createElement(tagName)
  }
  setAttribute(name, value) {
    // 事件处理
    if (name.match(/^on([\s\S]+)/)) {
      const eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase())
      this.root.addEventListener(eventName, value)
    } else {
      if (name === 'className') {
        this.root.setAttribute('class', value)
      } else {
        this.root.setAttribute(name, value)
      }
    }
  }
  appendChild(component) {
    const range = document.createRange()
    // 每次appendChild，都是最后一个
    range.setStart(this.root, this.root.childNodes.length)
    range.setEnd(this.root, this.root.childNodes.length)
    component[RENDER_TO_DOM](range)
  }
  [RENDER_TO_DOM](range) {
    range.deleteContents()
    range.insertNode(this.root)
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content)
  }
  [RENDER_TO_DOM](range) {
    range.deleteContents()
    range.insertNode(this.root)
  }
}

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
  // 改造成基于range操作dom，方便后续rerender
  [RENDER_TO_DOM](range) {
    this._range = range
    // 递归调用Component的[RENDER_TO_DOM]，直至遇到ElementWrapper或TextWrapper
    this.render()[RENDER_TO_DOM](range)
  }
  rerender() {
    // 清空range的内容，重新渲染
    // 原来的直接删除，
    let oldRange = this._range
    
    const range = document.createRange()
    range.setStart(oldRange.startContainer, oldRange.startOffset)
    range.setEnd(oldRange.startContainer, oldRange.startOffset)
    this[RENDER_TO_DOM](range)
    
    oldRange.setStart(range.endContainer, range.endOffset)
    oldRange.deleteContents()
  }
  setState(newState) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState
      this.rerender()
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
    this.rerender()
  }
  // get root() {
  //   if (!this._root) {
  //     // 会递归，直到遇到ElementWrapper或TextWrapper
  //     this._root = this.render().root
  //   }
  //   return this._root
  // }
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