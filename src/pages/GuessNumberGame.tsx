import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Zap, Target, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  min: number;
  max: number;
  label: string;
  icon: typeof Zap;
  color: string;
  badgeColor: string;
}

const difficultyConfig: Record<Difficulty, DifficultyConfig> = {
  easy: {
    min: 1,
    max: 50,
    label: 'Easy',
    icon: Zap,
    color: 'text-success',
    badgeColor: 'bg-success/10 text-success border-success/20'
  },
  medium: {
    min: 1,
    max: 100,
    label: 'Medium',
    icon: Target,
    color: 'text-primary',
    badgeColor: 'bg-primary/10 text-primary border-primary/20'
  },
  hard: {
    min: 1,
    max: 500,
    label: 'Hard',
    icon: Flame,
    color: 'text-destructive',
    badgeColor: 'bg-destructive/10 text-destructive border-destructive/20'
  }
};

const GuessNumberGame = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [secretNumber, setSecretNumber] = useState(0);
  const [guessCount, setGuessCount] = useState(0);
  const [userGuess, setUserGuess] = useState('');
  const [message, setMessage] = useState('Take a guess!');
  const [messageColor, setMessageColor] = useState('text-foreground');
  const [gameOver, setGameOver] = useState(false);

  const initializeGame = (selectedDifficulty: Difficulty) => {
    const config = difficultyConfig[selectedDifficulty];
    setDifficulty(selectedDifficulty);
    setSecretNumber(Math.floor(Math.random() * (config.max - config.min + 1)) + config.min);
    setGuessCount(0);
    setUserGuess('');
    setMessage('Take a guess!');
    setMessageColor('text-foreground');
    setGameOver(false);
  };

  const resetToMenu = () => {
    setDifficulty(null);
    setGameOver(false);
  };

  const checkGuess = () => {
    if (!difficulty) return;
    
    const config = difficultyConfig[difficulty];
    const guess = parseInt(userGuess);

    if (isNaN(guess) || guess < config.min || guess > config.max) {
      setMessage(`Please enter a number between ${config.min} and ${config.max}.`);
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

  // Difficulty Selection Screen
  if (!difficulty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-card p-8 w-full max-w-2xl mx-4 shadow-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Guess the Number! 🔢
          </h1>

          <p className="text-center text-muted-foreground mb-8 text-lg md:text-xl">
            Choose your difficulty level to start playing
          </p>

          <div className="grid gap-4 md:gap-6">
            {(Object.keys(difficultyConfig) as Difficulty[]).map((diff) => {
              const config = difficultyConfig[diff];
              const Icon = config.icon;
              
              return (
                <Card
                  key={diff}
                  role="button"
                  tabIndex={0}
                  aria-label={`Play ${config.label} difficulty, numbers from ${config.min} to ${config.max}`}
                  className="p-6 cursor-pointer hover-lift group hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => initializeGame(diff)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      initializeGame(diff);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      diff === 'easy' ? 'bg-success/10' :
                      diff === 'medium' ? 'bg-primary/10' :
                      'bg-destructive/10'
                    } group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-8 w-8 ${config.color}`} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl md:text-2xl font-bold mb-1">{config.label}</h3>
                      <p className="text-muted-foreground text-base">
                        Numbers from {config.min} to {config.max}
                      </p>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      Play
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const config = difficultyConfig[difficulty];
  const DifficultyIcon = config.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="glass-card p-8 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToMenu}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Change Level
          </Button>
          
          <Badge className={`${config.badgeColor} border`}>
            <DifficultyIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
          Guess the Number! 🔢
        </h1>

        <p className="text-center text-muted-foreground mb-6 text-lg">
          I'm thinking of a number between {config.min} and {config.max}.
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
              min={config.min}
              max={config.max}
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
          <div className="space-y-3">
            <Button
              onClick={() => initializeGame(difficulty)}
              variant="success"
              className="w-full text-lg"
              size="lg"
            >
              Play Again
            </Button>
            <Button
              onClick={resetToMenu}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Change Difficulty
            </Button>
          </div>
        )}

        <p className={`text-center text-xl font-semibold mt-6 min-h-12 ${messageColor}`}>
          {message}
        </p>
      </Card>
    </div>
  );
};

export default GuessNumberGame;
