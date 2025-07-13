import { useEffect, useState } from 'react'

function TestComponent() {
  const [test, setTest] = useState('')
  
  useEffect(() => {
    if (test) {
      console.log(test)
    }
  }, [test])

  return (
    <div className="test">
      <p>Test</p>
    </div>
  )
}

export default TestComponent