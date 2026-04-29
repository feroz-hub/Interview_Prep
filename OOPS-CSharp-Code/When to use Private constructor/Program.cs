using System;

namespace When_to_use_Private_constructor
{
    class Program
    {
        static void Main(string[] args)
        {            
            Employee.GetManager();

            Console.ReadLine();
        }
    }

    public class Employee
    {
        private Employee()
        {
            
        }        
        public static void GetManager() 
        {
            Console.WriteLine("Happy");
        }
    }
}
