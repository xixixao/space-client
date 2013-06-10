define ['services/services'], (services) ->
  services.factory 'question', [
    '$http'
    ($http) ->
      class QuestionService
        @newQuestion = (text, user) ->
          text: text
          user: user
          answers: []
          comments: []

        @get = (uri) ->
          switch uri
            when "topics/222/files/intro/questions/1"
              id: 1
              owner:
                name: "Anonymous"
                username: "an211"
              text: "I am not sure what this means."
              position: "[\"[200, 600, 1]\",\"[400, 700, 1]\"]"
              timestamp: new Date()
              comments:
                '1':
                  owner:
                    name: "Anonymous"
                  text: "Interesting question."
                '2':
                  owner:
                    name: "Anonymous"
                  text: "Or just a stupid one."
              answers:
                '1':
                  owner:
                    name: "Anonymous"
                  text: """<p>\"a brief summary of the user interactions in your program\"
                    <p>What we want top see here is a high-level discussion of what interactions take place between the users and the app.
                    You don't need to go into too much detail, just make the purpose and use of the app clear.
                    <br>
                    <p>So, for example, if your app were the exam communications system example from the spec then the user interactions would include:<br>
                    > Invigilators can communicate silently during an exam<br>
                    > Invigilators can request assistance in their room<br>
                    > Invigilators can check the status of all currently running exams<br>
                    ...etc...
                    <p>If your app is a game, then we want a brief summary of the rules and how the user plays the game."""
                  comments:
                    '1':
                      owner:
                        name: "Anonymous"
                      text: "A lion?"
                    '2':
                      owner:
                        name: "Anonymous"
                      text: "A cat for sure."
                '2':
                  owner:
                    name: "Anonymous"
                  text: "I think it is concerned with the abdominal spacial features of enlarged natural language complexities."
            when "topics/222/files/intro/questions/2"
              id: 1
              owner:
                name: "Anonymous"
              text: "How come?"
              position: "[\"[300, 100, 1]\",\"[500, 200, 1]\"]"
              timestamp: new Date()
              comments: {}
              answers: {}

  ]