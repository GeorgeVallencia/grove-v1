async function listModels() {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyC12mFsLgdOaPNsokJlchQBDBkoR5GDe0w'
    )
    const data = await response.json()
    
    if (data.models) {
      console.log('Available models that support generateContent:')
      data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .forEach(m => {
          console.log(`- ${m.name}`)
        })
    } else {
      console.log('Response:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

listModels()

// const { GoogleGenerativeAI } = require('@google/generative-ai')

// const genAI = new GoogleGenerativeAI('AIzaSyC12mFsLgdOaPNsokJlchQBDBkoR5GDe0w')

// async function test() {
//   try {
//     console.log('Testing gemini-1.5-flash...')
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
//     const result = await model.generateContent('Say hello')
//     console.log('SUCCESS:', result.response.text())
//   } catch (error) {
//     console.error('ERROR:', error.message)
//     console.error('Status:', error.status)
//   }
// }

// test()