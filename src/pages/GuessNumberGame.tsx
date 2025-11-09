import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GuessNumberGame = () => {
  const navigate = useNavigate();
  const [secretNumber, setSecretNumber] = useState(0);
  const [guessCount, setGuessCount] = useState(0);
  const [userGuess, setUserGuess] = useState('');
  const [message, setMessage] = useState('Take a guess!');
  const [messageColor, setMessageColor] = useState('text-foreground');
  const [gameOver, setGameOver] = useState(false);
  
  const minNum = 1;
  const maxNum = 100;

  const initializeGame = () => {
    setSecretNumber(Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum);
    setGuessCount(0);
    setUserGuess('');
    setMessage('Take a guess!');
    setMessageColor('text-foreground');
    setGameOver(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const checkGuess = () => {
    const guess = parseInt(userGuess);

    if (isNaN(guess) || guess < minNum || guess > maxNum) {
      setMessage(`Please enter a number between ${minNum} and ${maxNum}.`);
      setMessageColor('text-destructive');
      return;
    }

    const newGuessCount = guessCount + 1;
    setGuessCount(newGuessCount);

    if (guess === secretNumber) {
      setMessage(`🎉 Correct! You got it in ${newGuessCount} guesses! 🎉`);
      setMessageColor('text-success');
      setGameOver(true);
    } else if (guess < secretNumber) {
      setMessage('Too low! Try again.');
      setMessageColor('text-destructive');
    } else {
      setMessage('Too high! Try again.');
      setMessageColor('text-destructive');
    }

    setUserGuess('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !gameOver) {
      checkGuess();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="glass-card p-8 w-full max-w-md mx-4 shadow-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <h1 className="text-3xl font-bold text-center mb-2">
          Guess the Number! 🔢
        </h1>

        <p className="text-center text-muted-foreground mb-6">
          I'm thinking of a number between {minNum} and {maxNum}.
        </p>

        {!gameOver ? (
          <div>
            <Input
              type="number"
              value={userGuess}
              onChange={(e) => setUserGuess(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter your guess"
              className="text-center text-lg mb-4"
              min={minNum}
              max={maxNum}
            />

            <Button
              onClick={checkGuess}
              variant="gradient"
              className="w-full text-lg"
              size="lg"
            >
              Guess
            </Button>
          </div>
        ) : (
          <Button
            onClick={initializeGame}
            variant="success"
            className="w-full text-lg"
            size="lg"
          >
            Play Again
          </Button>
        )}

        <p className={`text-center text-lg font-medium mt-6 h-12 ${messageColor}`}>
          {message}
        </p>
      </Card>
    </div>
  );
};

export default GuessNumberGame;
