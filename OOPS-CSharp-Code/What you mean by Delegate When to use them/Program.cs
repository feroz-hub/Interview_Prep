using System;
using System.Reflection;

//Q. What you mean by Delegate? When to use them?
//A Delegate is a variable that holds the REFERENCE TO A METHOD. Or you can say it’s a pointer to a function.
//A delegate can refer to more than one methods of same return type and parameters.

namespace What_you_mean_by_Delegate_When_to_use_them
{
    //A Normal Delegate

    
    delegate void Calculator(int x, int y);

    class Program
    {
        public static void Add(int a, int b)
        {
            Console.WriteLine(a + b);
        }
        public static void Mul(int a, int b)
        {
            Console.WriteLine(a * b);
        }

        static void Main(string[] args)
        {
            //Instantiating Delegate
            Calculator calc = new Calculator(Add);
            
            //Calling method using delegate
            calc(20, 30);
        }       
    }  

}
