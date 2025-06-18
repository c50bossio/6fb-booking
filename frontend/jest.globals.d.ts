declare global {
  var mockRouter: {
    push: jest.Mock
    replace: jest.Mock
    prefetch: jest.Mock
    back: jest.Mock
  }
  var mockPathname: string
}

export {}