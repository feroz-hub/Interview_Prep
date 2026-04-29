using System;

//Q. What is the difference between “continue” and “break” statement?

namespace What_is_the_difference_between__continue__and__break__statement
{
    class Program
    {
        static void Main(string[] args)
        {           
            for (int i = 0; i < 5; i++)
            {      
                if (i == 3)
                {
                    break;
                }
                Console.WriteLine("Print: " + i);
            }
            Console.ReadLine();
        }
    }
}
