class ElementWrapper {
  constructor(tagName) {
    this.root = document.createElement(tagName)
  }
  setAttribute(name, value) {
    this.root.setAttribute(name, value)
  }
  appendChild(component) {
    this.root.appendChild(component.root)
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content)
  }
}

// Component 基类，不能直接使用，自定义组件继承它，实现render函数
export class Component {
  constructor() {
    this.props = Object.create(null)
    this.children = []
    this._root = null
  }
  setAttribute(name, value) {
    this.props[name] = value
  }
  appendChild(component) {
    // 这里并不是原始DOM，先把children保存，之后render再处理
    this.children.push(component)
  }
  get root() {
    if (!this._root) {
      // 会递归，直到遇到ElementWrapper或TextWrapper
      this._root = this.render().root
    }
    return this._root
  }
}

export function createElement(type, attributes, ...children) {
  let element = null
  if (typeof type === 'string') {
    element = new ElementWrapper(type)
  } else {
    // 自定义的组件正常是无法正常渲染出dom的，这时候需要对原生的DOM进行wrap包装
    element = new type()
  }

  for (let key in attributes) {
    element.setAttribute(key, attributes[key])
  }
  
  let insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === 'string') {
        child = new TextWrapper(child)
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
  parentElement.appendChild(component.root)
}