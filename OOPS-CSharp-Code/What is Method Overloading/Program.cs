using System;

//What is Method Overloading? In how many ways a method can be overloaded?
//Method overloading is a kind of compile time polymorphism, in which we can create
//multiple methods of the same name in the same class, and all methods work in different ways.
namespace What_is_Method_Overloading
{
    class Program
    {
        static void Main(string[] args)
        {
            MethodOverloading obj = new MethodOverloading();

            int a = obj.Add(5, 10);

            int b = obj.Add(5, 10, 15);

            double c = obj.Add(1.5, 5.5, 10);

            double d = obj.Add(1.5, 5, 10.5);

            Console.WriteLine("a: " + a + "b: " + b + "c: " + c + "d: " + d);
        }
    }

    public class MethodOverloading
    {
        public int Add(int a, int b)
        {
            return a + b;
        }

        public int Add(int a, int b, int c)
        {
            return a + b + c;
        }

        public double Add(double a, double b, int c)
        {
            return a + b + c;
        }

        public double Add(double a, int c, double b)
        {
            return a + b + c;
        }
    }

}
